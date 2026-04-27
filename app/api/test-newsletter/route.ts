import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { email, vakgebied, organisatie, voorkeuren } = await req.json()

  if (!email || !vakgebied) {
    return NextResponse.json({ error: 'email en vakgebied zijn verplicht' }, { status: 400 })
  }

  // Zoek subscriber op of gebruik testprofiel
  const { data: sub } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', email)
    .single()

  const profiel = sub ?? {
    naam: 'Test ontvanger',
    email,
    vakgebied,
    organisatie: organisatie ?? 'mkb',
    voorkeuren: voorkeuren ?? null,
    bronnen: [],
    token: 'test-token',
  }

  // Gebruik bestaande bronnen of haal nieuwe op
  let bronnen = profiel.bronnen ?? []
  if (!bronnen.length) {
    const { getBronnen } = await import('@/lib/sources')
    bronnen = await getBronnen(vakgebied)
  }

  // Haal artikelen op van afgelopen 30 dagen (ruimer voor test)
  const artikelen = await fetchArtikelen(bronnen, 30)

  if (!artikelen.length) {
    return NextResponse.json({ error: 'Geen artikelen gevonden voor dit vakgebied', bronnen }, { status: 404 })
  }

  const beheerUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/voorkeuren?token=${profiel.token}`
  const resultaat = await genereerNieuwsbrief(artikelen, profiel, beheerUrl)

  if (!resultaat) {
    return NextResponse.json({ error: 'Claude vond geen relevante updates in de gevonden artikelen', aantalArtikelen: artikelen.length }, { status: 404 })
  }

  // Verstuur de testmail
  const { error } = await resend.emails.send({
    from: `Briefd Test <test@${process.env.EMAIL_DOMEIN}>`,
    to: email,
    subject: `[TEST] ${resultaat.onderwerp}`,
    html: resultaat.html,
  })

  if (error) {
    return NextResponse.json({ error: 'Versturen mislukt', details: error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    onderwerp: resultaat.onderwerp,
    aantalArtikelen: artikelen.length,
    email,
  })
}
