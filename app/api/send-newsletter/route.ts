// Maandagcron — agent-pipeline met pre-send goedkeurflow.
//
// Volgorde:
// 1. Check of er goedgekeurde concepten uit de vrijdagcron klaarstaan.
//    → Ja: stuur die direct via Resend (slaat stappen 1-4 opnieuw over).
//    → Concepten bestaan maar niet goedgekeurd: alert + skip.
//    → Geen concepten: fallback naar volledige pipeline (vrijdagcron niet gedraaid).

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { getBronnen } from '@/lib/sources'
import { uitlegVakgebied, bepaalTaal } from '@/lib/generator'
import { scoutAgent } from '@/lib/agents/scout'
import { classificatieAgent } from '@/lib/agents/classificatie'
import { redactieAgent } from '@/lib/agents/redactie'
import { kwaliteitscontroleAgent } from '@/lib/agents/kwaliteitscontrole'
import { personalisatieEnVerzendAgent } from '@/lib/agents/personalisatie'
import { registreerGepubliceerdeItems, registreerUitConceptPreview, type ConceptItemPreview } from '@/lib/agents/herziening'
import { stuurAlertMail } from '@/lib/agents/alert'

const resend = new Resend(process.env.RESEND_API_KEY!)

function isEersteMaandagVanMaand(): boolean {
  const nu = new Date()
  return nu.getDay() === 1 && nu.getDate() <= 7
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  if (!adminEmail) return NextResponse.json({ error: 'ADMIN_EMAIL niet ingesteld' }, { status: 500 })

  // --- Check voor goedgekeurde concepten (vrijdagcron) ---
  const zevenDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: alleConcepten } = await supabase
    .from('concept_nieuwsbrieven')
    .select('*')
    .gte('aangemaakt_op', zevenDagenGeleden)
    .neq('status', 'geannuleerd')

  const goedgekeurdeConcepten = (alleConcepten ?? []).filter(c => c.status === 'goedgekeurd')
  const wachtendeConcepten = (alleConcepten ?? []).filter(c => c.status === 'in_afwachting')

  if (wachtendeConcepten.length > 0 && goedgekeurdeConcepten.length === 0) {
    await stuurAlertMail(
      'Maandagcron: concepten niet goedgekeurd — geen verzending',
      [
        `Er staan ${wachtendeConcepten.length} concepten klaar maar je hebt ze nog niet goedgekeurd.`,
        `Ga naar je mail van vrijdag en klik op "Goedkeuren" — of stuur handmatig via het admin-dashboard.`,
        `Vandaag is er <strong>niets verstuurd</strong>.`,
      ]
    )
    return NextResponse.json({ ok: true, mode: 'geblokkeerd', reden: 'wacht op goedkeuring', wachtend: wachtendeConcepten.length })
  }

  if (goedgekeurdeConcepten.length > 0) {
    return stuurGoedgekeurdeConcepten(goedgekeurdeConcepten, emailDomein, baseUrl)
  }

  const alVerzonden = (alleConcepten ?? []).every(c => c.status === 'verzonden')
  if (alVerzonden && (alleConcepten ?? []).length > 0) {
    return NextResponse.json({ ok: true, mode: 'al-verzonden', reden: 'concepten deze week al verstuurd' })
  }

  // Geen concepten gevonden → fallback: volledige pipeline
  if ((alleConcepten ?? []).length === 0) {
    await stuurAlertMail('Maandagcron: vrijdagcron niet gedraaid — fallback naar directe pipeline', [
      'Er zijn geen concepten gevonden uit de vrijdagcron.',
      'De volledige pipeline draait nu als fallback.',
    ])
  }

  return volledigePipeline(adminEmail, emailDomein, baseUrl)
}

async function stuurGoedgekeurdeConcepten(
  concepten: Record<string, unknown>[],
  emailDomein: string,
  baseUrl: string
) {
  const verzonden: string[] = []
  const fouten: { email: string; reden: string }[] = []

  for (const concept of concepten) {
    try {
      const { error } = await resend.emails.send({
        from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
        to: concept.email as string,
        subject: concept.onderwerp as string,
        html: concept.html as string,
      })
      if (error) throw new Error(JSON.stringify(error))

      await supabase
        .from('concept_nieuwsbrieven')
        .update({ status: 'verzonden' })
        .eq('id', concept.id)

      await supabase.from('nieuwsbrief_log').insert({
        subscriber_id: concept.subscriber_id,
        onderwerp: concept.onderwerp,
        status: 'verstuurd',
      })
      await supabase
        .from('subscribers')
        .update({ laatste_mail_op: new Date().toISOString() })
        .eq('id', concept.subscriber_id)

      // Dit is het reguliere wekelijkse verzendpad (goedgekeurde vrijdag-concepten) —
      // zonder dit registreerde alleen de fallback-pipeline ooit iets in
      // gepubliceerde_items, waardoor die tabel in de praktijk altijd leeg bleef.
      const preview = concept.items_preview as ConceptItemPreview[] | null
      if (preview && preview.length > 0) {
        await registreerUitConceptPreview(preview)
      }

      verzonden.push(concept.email as string)
    } catch (err) {
      const reden = err instanceof Error ? err.message : String(err)
      fouten.push({ email: concept.email as string, reden })
    }
  }

  if (fouten.length > 0) {
    await stuurAlertMail(
      `Maandagcron: ${fouten.length} fout${fouten.length !== 1 ? 'en' : ''} bij verzenden van goedgekeurde concepten`,
      fouten.map(f => `${f.email} — <code>${f.reden}</code>`)
    )
  }

  return NextResponse.json({ ok: true, mode: 'concepten', verzonden: verzonden.length, fouten: fouten.length })
}

async function volledigePipeline(adminEmail: string, emailDomein: string, baseUrl: string) {
  const eersteWeek = isEersteMaandagVanMaand()

  const { data: abonnees, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, branche, organisatie, frequentie, bronnen, bronnen_gegenereerd_op, token, voorkeuren, land')
    .eq('actief', true)

  if (dbFout || !abonnees) {
    await stuurAlertMail('Cron job mislukt — database fout', [
      `De cron job kon geen subscribers ophalen.`,
      `Fout: <code>${dbFout?.message ?? 'Geen data'}</code>`,
    ])
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  const verzonden: string[] = []
  const overgeslagen: string[] = []
  const geescaleerd: { email: string; aantalAfgekeurd: number }[] = []
  const fouten: { email: string; reden: string }[] = []

  for (const abonnee of abonnees) {
    if (abonnee.frequentie === 'maandelijks' && !eersteWeek) {
      overgeslagen.push(abonnee.email)
      continue
    }

    try {
      let bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
      const gegenereerd = abonnee.bronnen_gegenereerd_op ? new Date(abonnee.bronnen_gegenereerd_op) : null
      const zevenDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      if (bronnen.length === 0 || !gegenereerd || gegenereerd < zevenDagenGeleden) {
        bronnen = await getBronnen(abonnee.vakgebied, {
          branche: abonnee.branche ?? undefined,
          extraOnderwerpen: abonnee.voorkeuren?.extraOnderwerpen ?? undefined,
          land: abonnee.land ?? 'NL',
        })
        if (bronnen.length > 0) {
          await supabase.from('subscribers').update({
            bronnen,
            bronnen_gegenereerd_op: new Date().toISOString(),
          }).eq('id', abonnee.id)
        }
      }
      if (bronnen.length === 0) { overgeslagen.push(abonnee.email); continue }

      const dagenTerug = abonnee.frequentie === 'maandelijks' ? 31 : 7
      const profiel = {
        naam: abonnee.naam,
        vakgebied: abonnee.vakgebied,
        branche: abonnee.branche ?? undefined,
        organisatie: abonnee.organisatie,
        land: abonnee.land ?? 'NL',
        voorkeuren: abonnee.voorkeuren ?? undefined,
      }

      const artikelen = await scoutAgent(bronnen, dagenTerug, abonnee.id)
      if (artikelen.length === 0) { overgeslagen.push(abonnee.email); continue }

      const vakgebiedContext = uitlegVakgebied(abonnee.vakgebied)
      const geclassificeerd = await classificatieAgent(artikelen, vakgebiedContext, abonnee.id)
      const redactieResultaat = await redactieAgent(geclassificeerd, profiel, abonnee.id)
      if (!redactieResultaat) { overgeslagen.push(abonnee.email); continue }

      const qc = await kwaliteitscontroleAgent(redactieResultaat, geclassificeerd, abonnee.id)
      if (qc.afgekeurd.length > 0) geescaleerd.push({ email: abonnee.email, aantalAfgekeurd: qc.afgekeurd.length })
      if (qc.goedgekeurd.length === 0) { overgeslagen.push(abonnee.email); continue }

      const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`
      const verzendResultaat = await personalisatieEnVerzendAgent(
        qc.goedgekeurd,
        redactieResultaat.onderwerp,
        profiel,
        beheerUrl,
        emailDomein,
        abonnee.email,
        abonnee.id
      )
      if (!verzendResultaat.verzonden) throw new Error(verzendResultaat.reden ?? 'onbekende verzendfout')

      const taal = abonnee.voorkeuren?.taal || bepaalTaal(abonnee.land ?? 'NL')
      await registreerGepubliceerdeItems(
        qc.goedgekeurd.map(item => {
          const bron = geclassificeerd.find(a => a.url === item.bronUrl)
          return { item, bronSnapshot: bron?.samenvatting ?? item.samenvatting, taal }
        })
      )

      await supabase.from('nieuwsbrief_log').insert({
        subscriber_id: abonnee.id,
        onderwerp: redactieResultaat.onderwerp,
        status: 'verstuurd',
      })
      await supabase
        .from('subscribers')
        .update({ laatste_mail_op: new Date().toISOString() })
        .eq('id', abonnee.id)

      verzonden.push(abonnee.email)
    } catch (err) {
      const reden = err instanceof Error ? err.message : String(err)
      fouten.push({ email: abonnee.email, reden })
    }
  }

  if (fouten.length > 0 || geescaleerd.length > 0) {
    await stuurAlertMail(
      `Cron job: ${fouten.length} fout${fouten.length !== 1 ? 'en' : ''}, ${geescaleerd.length} escalatie${geescaleerd.length !== 1 ? 's' : ''}`,
      [
        `${verzonden.length} van ${abonnees.length} abonnees verwerkt. ${overgeslagen.length} overgeslagen.`,
        ...(fouten.length > 0 ? [`<strong>Mislukt:</strong>`, ...fouten.map(f => `${f.email} — <code>${f.reden}</code>`)] : []),
        ...(geescaleerd.length > 0 ? [`<strong>QC-afkeuringen:</strong>`, ...geescaleerd.map(g => `${g.email} — ${g.aantalAfgekeurd} item(s) afgekeurd`)] : []),
      ]
    )
  }

  return NextResponse.json({ ok: true, mode: 'pipeline', verzonden: verzonden.length, overgeslagen: overgeslagen.length, geescaleerd: geescaleerd.length, fouten: fouten.length })
}
