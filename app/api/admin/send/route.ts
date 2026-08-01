import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { sessionToken } from '@/lib/auth'
import { getBronnen } from '@/lib/sources'
import { uitlegVakgebied } from '@/lib/generator'
import { scoutAgent } from '@/lib/agents/scout'
import { classificatieAgent } from '@/lib/agents/classificatie'
import { redactieAgent } from '@/lib/agents/redactie'
import { kwaliteitscontroleAgent } from '@/lib/agents/kwaliteitscontrole'
import { personalisatieEnVerzendAgent } from '@/lib/agents/personalisatie'

const resend = new Resend(process.env.RESEND_API_KEY!)

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === sessionToken(adminPassword)
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, bestemming = 'admin' } = await req.json()
  if (!email) return NextResponse.json({ error: 'E-mailadres vereist' }, { status: 400 })
  if (!['admin', 'subscriber', 'beide'].includes(bestemming)) {
    return NextResponse.json({ error: 'Ongeldige bestemming' }, { status: 400 })
  }

  const { data: abonnee, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, branche, organisatie, frequentie, bronnen, bronnen_gegenereerd_op, token, actief, voorkeuren, land')
    .eq('email', email)
    .single()

  if (dbFout?.code === 'PGRST116' || !abonnee) {
    return NextResponse.json({ error: 'Subscriber niet gevonden' }, { status: 404 })
  }
  if (dbFout) return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  if (!abonnee.actief) return NextResponse.json({ error: 'Subscriber is uitgeschreven' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return NextResponse.json({ error: 'ADMIN_EMAIL niet ingesteld' }, { status: 500 })

  // Verse bronnen ophalen
  let bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
  const verseBronnen = await getBronnen(abonnee.vakgebied, {
    branche: abonnee.branche ?? undefined,
    extraOnderwerpen: abonnee.voorkeuren?.extraOnderwerpen ?? undefined,
    land: abonnee.land ?? 'NL',
  })
  if (verseBronnen.length > 0) {
    bronnen = verseBronnen
    await supabase.from('subscribers').update({
      bronnen,
      bronnen_gegenereerd_op: new Date().toISOString(),
    }).eq('id', abonnee.id)
  }
  if (bronnen.length === 0) {
    return NextResponse.json({ error: 'Geen bronnen beschikbaar voor dit vakgebied' }, { status: 400 })
  }

  const profiel = {
    naam: abonnee.naam,
    vakgebied: abonnee.vakgebied,
    branche: abonnee.branche ?? undefined,
    organisatie: abonnee.organisatie,
    land: abonnee.land ?? 'NL',
    voorkeuren: abonnee.voorkeuren ?? undefined,
  }

  // Volledige agent-pipeline (zelfde als de maandag-cron)
  const artikelen = await scoutAgent(bronnen, 30, abonnee.id)
  if (artikelen.length === 0) {
    return NextResponse.json({ ok: false, reden: 'Geen recente artikelen gevonden in de bronnen' })
  }

  const vakgebiedContext = uitlegVakgebied(abonnee.vakgebied)
  const geclassificeerd = await classificatieAgent(artikelen, vakgebiedContext, abonnee.id)
  const redactieResultaat = await redactieAgent(geclassificeerd, profiel, abonnee.id)
  if (!redactieResultaat) {
    return NextResponse.json({ ok: false, reden: 'Geen relevante updates gevonden na classificatie' })
  }

  const qc = await kwaliteitscontroleAgent(redactieResultaat, geclassificeerd, abonnee.id)
  if (qc.goedgekeurd.length === 0) {
    return NextResponse.json({
      ok: false,
      reden: `Kwaliteitscontrole keurde alle ${qc.afgekeurd.length} item(s) af`,
      afgekeurd: qc.afgekeurd.map(a => ({ titel: a.item.titel, reden: a.reden })),
    })
  }

  const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`

  // Genereer HTML zonder direct te sturen (dryRun)
  const preview = await personalisatieEnVerzendAgent(
    qc.goedgekeurd,
    redactieResultaat.onderwerp,
    profiel,
    beheerUrl,
    emailDomein,
    abonnee.email,
    abonnee.id,
    { dryRun: true }
  )
  if (!preview.html) {
    return NextResponse.json({ ok: false, reden: 'HTML genereren mislukt' }, { status: 500 })
  }

  // Verstuur naar de gekozen bestemming
  const verzendingen: Promise<{ error: unknown }>[] = []

  if (bestemming === 'admin' || bestemming === 'beide') {
    verzendingen.push(resend.emails.send({
      from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
      to: adminEmail,
      subject: `[TEST voor ${abonnee.naam}] ${redactieResultaat.onderwerp}`,
      html: preview.html,
    }))
  }
  if (bestemming === 'subscriber' || bestemming === 'beide') {
    verzendingen.push(resend.emails.send({
      from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
      to: abonnee.email,
      subject: redactieResultaat.onderwerp,
      html: preview.html,
    }))
  }

  const resultaten = await Promise.all(verzendingen)
  const mailFout = resultaten.find(r => r.error)?.error
  if (mailFout) {
    return NextResponse.json({ error: 'Versturen mislukt', detail: mailFout }, { status: 500 })
  }

  if (bestemming === 'subscriber' || bestemming === 'beide') {
    await Promise.all([
      supabase.from('nieuwsbrief_log').insert({
        subscriber_id: abonnee.id,
        onderwerp: redactieResultaat.onderwerp,
        status: 'verstuurd',
      }),
      supabase.from('subscribers')
        .update({ laatste_mail_op: new Date().toISOString() })
        .eq('id', abonnee.id),
    ])
  }

  return NextResponse.json({
    ok: true,
    onderwerp: redactieResultaat.onderwerp,
    aantalArtikelen: artikelen.length,
    goedgekeurd: qc.goedgekeurd.length,
    afgekeurd: qc.afgekeurd.length,
  })
}
