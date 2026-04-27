import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Stuur naar alle wekelijkse abonnees, en op de eerste maandag van de maand
// ook naar maandelijkse abonnees.
function isEersteMaandagVanMaand(): boolean {
  const nu = new Date()
  return nu.getDay() === 1 && nu.getDate() <= 7
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  }

  // Vercel Cron stuurt Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eersteWeek = isEersteMaandagVanMaand()

  // Haal actieve abonnees op
  const { data: abonnees, error } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, organisatie, frequentie, bronnen, token')
    .eq('actief', true)

  if (error || !abonnees) {
    console.error('Supabase fetch error:', error)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'example.com'
  const verzonden: string[] = []
  const overgeslagen: string[] = []

  for (const abonnee of abonnees) {
    // Sla maandelijkse abonnees over als het geen eerste week is
    if (abonnee.frequentie === 'maandelijks' && !eersteWeek) {
      overgeslagen.push(abonnee.email)
      continue
    }

    const bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
    if (bronnen.length === 0) {
      overgeslagen.push(abonnee.email)
      continue
    }

    const dagenTerug = abonnee.frequentie === 'maandelijks' ? 31 : 7
    const artikelen = await fetchArtikelen(bronnen, dagenTerug)
    const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`
    const resultaat = await genereerNieuwsbrief(
      artikelen,
      { naam: abonnee.naam, vakgebied: abonnee.vakgebied, organisatie: abonnee.organisatie },
      beheerUrl
    )

    if (!resultaat) {
      overgeslagen.push(abonnee.email)
      continue
    }

    const { error: mailFout } = await resend.emails.send({
      from: `Regelgeving Nieuwsbrief <nieuwsbrief@${emailDomein}>`,
      to: abonnee.email,
      subject: resultaat.onderwerp,
      html: resultaat.html,
    })

    if (mailFout) {
      console.error(`Mail fout voor ${abonnee.email}:`, mailFout)
      continue
    }

    // Log in database
    await supabase.from('nieuwsbrief_log').insert({
      subscriber_id: abonnee.id,
      onderwerp: resultaat.onderwerp,
      status: 'verstuurd',
    })

    await supabase
      .from('subscribers')
      .update({ laatste_mail_op: new Date().toISOString() })
      .eq('id', abonnee.id)

    verzonden.push(abonnee.email)
  }

  return NextResponse.json({
    ok: true,
    verzonden: verzonden.length,
    overgeslagen: overgeslagen.length,
  })
}
