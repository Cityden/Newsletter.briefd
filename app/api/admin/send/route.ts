import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'

const resend = new Resend(process.env.RESEND_API_KEY!)

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === adminPassword
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'E-mailadres vereist' }, { status: 400 })
  }

  const { data: abonnee, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, organisatie, frequentie, bronnen, token, actief')
    .eq('email', email)
    .single()

  if (dbFout || !abonnee) {
    return NextResponse.json({ error: 'Subscriber niet gevonden' }, { status: 404 })
  }

  if (!abonnee.actief) {
    return NextResponse.json({ error: 'Subscriber is uitgeschreven' }, { status: 400 })
  }

  const { getBronnen } = await import('@/lib/sources')

  let bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []

  // Altijd ophalen met verse bronnen — sla op in Supabase
  const verseBronnen = await getBronnen(abonnee.vakgebied)
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

  const dagenTerug = abonnee.frequentie === 'maandelijks' ? 31 : 30
  const artikelen = await fetchArtikelen(bronnen, dagenTerug)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'resend.dev'
  const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`

  const resultaat = await genereerNieuwsbrief(
    artikelen,
    { naam: abonnee.naam, vakgebied: abonnee.vakgebied, organisatie: abonnee.organisatie },
    beheerUrl
  )

  if (!resultaat) {
    return NextResponse.json({
      ok: false,
      reden: artikelen.length === 0
        ? 'Geen artikelen gevonden in de RSS-feeds'
        : 'Geen relevante updates voor dit vakgebied',
    })
  }

  const { error: mailFout } = await resend.emails.send({
    from: `Regelgeving Nieuwsbrief <onboarding@${emailDomein}>`,
    to: abonnee.email,
    subject: `[TEST] ${resultaat.onderwerp}`,
    html: resultaat.html,
  })

  if (mailFout) {
    return NextResponse.json({ error: 'Versturen mislukt', detail: mailFout }, { status: 500 })
  }

  return NextResponse.json({ ok: true, onderwerp: resultaat.onderwerp, aantalArtikelen: artikelen.length })
}
