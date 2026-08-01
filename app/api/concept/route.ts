// Vrijdagcron — stap 1 t/m 4 van de agent-pipeline per abonnee, zonder verzending.
// Slaat het gegenereerde HTML-concept op in concept_nieuwsbrieven en stuurt één
// goedkeurmail naar de admin. Maandagochtend verstuurt de send-newsletter cron
// alleen als de admin heeft goedgekeurd via de link in deze mail.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { getBronnen } from '@/lib/sources'
import { uitlegVakgebied } from '@/lib/generator'
import { scoutAgent } from '@/lib/agents/scout'
import { classificatieAgent } from '@/lib/agents/classificatie'
import { redactieAgent } from '@/lib/agents/redactie'
import { kwaliteitscontroleAgent } from '@/lib/agents/kwaliteitscontrole'
import { personalisatieEnVerzendAgent } from '@/lib/agents/personalisatie'

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

  const eersteWeek = isEersteMaandagVanMaand()

  const { data: abonnees, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, branche, organisatie, frequentie, bronnen, bronnen_gegenereerd_op, token, voorkeuren, land')
    .eq('actief', true)

  if (dbFout || !abonnees) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  const batchToken = randomUUID()
  const concepten: { naam: string; email: string; onderwerp: string; aantalItems: number }[] = []
  const overgeslagen: string[] = []
  const fouten: string[] = []

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
      if (qc.goedgekeurd.length === 0) { overgeslagen.push(abonnee.email); continue }

      const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`
      const result = await personalisatieEnVerzendAgent(
        qc.goedgekeurd,
        redactieResultaat.onderwerp,
        profiel,
        beheerUrl,
        emailDomein,
        abonnee.email,
        abonnee.id,
        { dryRun: true }
      )

      if (!result.html) { overgeslagen.push(abonnee.email); continue }

      const itemsPreview = qc.goedgekeurd.slice(0, 5).map(item => ({
        titel: item.titel,
        impact: item.impact,
        bronNaam: item.bronNaam,
      }))

      await supabase.from('concept_nieuwsbrieven').insert({
        batch_token: batchToken,
        subscriber_id: abonnee.id,
        email: abonnee.email,
        naam: abonnee.naam,
        onderwerp: redactieResultaat.onderwerp,
        html: result.html,
        items_preview: itemsPreview,
      })

      concepten.push({ naam: abonnee.naam, email: abonnee.email, onderwerp: redactieResultaat.onderwerp, aantalItems: qc.goedgekeurd.length })
    } catch (err) {
      console.error(`[concept] Fout bij ${abonnee.email}:`, err)
      fouten.push(abonnee.email)
    }
  }

  if (concepten.length === 0) {
    return NextResponse.json({ ok: true, concepten: 0, overgeslagen: overgeslagen.length, fouten: fouten.length })
  }

  const goedkeurUrl = `${baseUrl}/api/goedkeuren?token=${batchToken}`
  const datum = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })

  const conceptenHTML = concepten.map(c =>
    `<li style="margin-bottom:10px">
      <strong>${c.naam}</strong> (${c.email})<br>
      <span style="color:#666;font-size:13px">${c.onderwerp} · ${c.aantalItems} item${c.aantalItems !== 1 ? 's' : ''}</span>
    </li>`
  ).join('')

  const foutRegel = fouten.length > 0
    ? `<p style="color:#c00;font-size:13px">Let op: ${fouten.length} abonnee${fouten.length !== 1 ? 's' : ''} kon niet worden verwerkt (${fouten.join(', ')}).</p>`
    : ''

  await resend.emails.send({
    from: `Brieft Agents <newsletter@${emailDomein}>`,
    to: adminEmail,
    subject: `Concept klaar — ${concepten.length} nieuwsbrief${concepten.length !== 1 ? 'ven' : ''} wacht${concepten.length === 1 ? '' : 'en'} op goedkeuring`,
    html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:28px">
      <div style="font-size:11px;color:#999;margin-bottom:16px;text-transform:uppercase;letter-spacing:.06em">Brieft — vrijdagconcept</div>
      <div style="font-size:13px;color:#666;margin-bottom:20px">${datum}</div>
      <p style="font-size:15px;color:#111;margin:0 0 20px;line-height:1.6">
        De agent-pipeline heeft <strong>${concepten.length} nieuwsbrief${concepten.length !== 1 ? 'ven' : ''}</strong> klaargemaakt.
        Klik hieronder om ze goed te keuren — maandagochtend verstuurt de cron ze automatisch.
      </p>
      <ul style="font-size:14px;color:#333;line-height:1.6;padding-left:20px;margin:0 0 28px">
        ${conceptenHTML}
      </ul>
      ${foutRegel}
      <a href="${goedkeurUrl}"
         style="display:inline-block;background:#16a34a;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:-.2px">
        Goedkeuren → verstuur maandag
      </a>
      <p style="font-size:12px;color:#aaa;margin:20px 0 0;line-height:1.5">
        Niet goedkeuren? Dan wordt er maandag niets verstuurd en ontvang je een herinnering.
        Je kunt de link ook later die dag nog gebruiken als je meer tijd nodig hebt.
      </p>
    </div>
  </div>
</body>
</html>`,
  }).catch(e => console.error('[concept] Goedkeurmail mislukt:', e))

  return NextResponse.json({
    ok: true,
    batchToken,
    concepten: concepten.length,
    overgeslagen: overgeslagen.length,
    fouten: fouten.length,
  })
}
