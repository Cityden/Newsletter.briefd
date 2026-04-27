import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * GET /api/test-newsletter?email=jouw@email.nl
 *
 * Genereert en verstuurt de nieuwsbrief voor één abonnee, zonder cron.
 * Beveiligd met dezelfde CRON_SECRET als de echte cron job.
 *
 * Aanroepen:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" \
 *        "http://localhost:3000/api/test-newsletter?email=jouw@email.nl"
 */
export async function GET(req: NextRequest) {
  // ── Authenticatie ────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── E-mailadres uit query string ─────────────────────────────────────────
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json(
      { error: 'Geef een e-mailadres mee: ?email=jouw@email.nl' },
      { status: 400 }
    )
  }

  // ── Subscriber ophalen ───────────────────────────────────────────────────
  const { data: abonnee, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, organisatie, frequentie, bronnen, token, actief')
    .eq('email', email)
    .single()

  if (dbFout || !abonnee) {
    return NextResponse.json(
      { error: `Geen subscriber gevonden met e-mail: ${email}` },
      { status: 404 }
    )
  }

  if (!abonnee.actief) {
    return NextResponse.json(
      { error: `Subscriber ${email} is uitgeschreven (actief = false)` },
      { status: 400 }
    )
  }

  const bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
  if (bronnen.length === 0) {
    return NextResponse.json(
      { error: 'Subscriber heeft geen bronnen opgeslagen — meld opnieuw aan om bronnen te genereren' },
      { status: 400 }
    )
  }

  // ── Artikelen ophalen ────────────────────────────────────────────────────
  console.log(`[test-newsletter] Artikelen ophalen voor ${email} (${bronnen.length} bronnen)…`)
  const artikelen = await fetchArtikelen(bronnen, 7)
  console.log(`[test-newsletter] ${artikelen.length} artikelen gevonden`)

  // ── Nieuwsbrief genereren ────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'resend.dev'
  const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`

  console.log(`[test-newsletter] Nieuwsbrief genereren voor ${abonnee.naam}…`)
  const resultaat = await genereerNieuwsbrief(
    artikelen,
    { naam: abonnee.naam, vakgebied: abonnee.vakgebied, organisatie: abonnee.organisatie },
    beheerUrl
  )

  if (!resultaat) {
    return NextResponse.json({
      ok: false,
      email,
      aantalArtikelen: artikelen.length,
      reden: artikelen.length === 0
        ? 'Geen artikelen gevonden in de RSS-feeds'
        : 'Claude vond geen relevante updates voor dit vakgebied deze week',
    })
  }

  // ── Versturen ────────────────────────────────────────────────────────────
  console.log(`[test-newsletter] Mail versturen naar ${email}…`)
  const { error: mailFout } = await resend.emails.send({
    from: `Regelgeving Nieuwsbrief <onboarding@${emailDomein}>`,
    to: abonnee.email,
    subject: `[TEST] ${resultaat.onderwerp}`,
    html: resultaat.html,
  })

  if (mailFout) {
    console.error(`[test-newsletter] Mail fout:`, mailFout)
    return NextResponse.json(
      { error: 'Versturen mislukt', detail: mailFout },
      { status: 500 }
    )
  }

  // ── Geen log in nieuwsbrief_log — dit is een test ───────────────────────

  console.log(`[test-newsletter] Klaar ✓`)
  return NextResponse.json({
    ok: true,
    email,
    naam: abonnee.naam,
    vakgebied: abonnee.vakgebied,
    onderwerp: `[TEST] ${resultaat.onderwerp}`,
    aantalArtikelen: artikelen.length,
    aantalItems: resultaat.html.match(/<div style="font-size:16px/g)?.length ?? '?',
  })
}
