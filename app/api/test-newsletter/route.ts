import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { email, vakgebied, organisatie, branche, land, voorkeuren } = await req.json()

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
    branche: branche ?? null,
    land: land ?? 'NL',
    voorkeuren: voorkeuren ?? null,
    bronnen: [],
    token: 'test-token',
  }

  // Altijd vers ophalen bij test, zodat nieuwe params direct zichtbaar zijn
  const { getBronnen } = await import('@/lib/sources')
  const bronnen = await getBronnen(profiel.vakgebied, {
    branche: profiel.branche ?? undefined,
    extraOnderwerpen: profiel.voorkeuren?.extraOnderwerpen ?? undefined,
    land: profiel.land ?? 'NL',
  })

  if (!bronnen.length) {
    return NextResponse.json({ error: 'Geen bronnen gevonden voor dit vakgebied en land. Probeer een ander vakgebied of controleer of de Claude API bereikbaar is.', bronnen: [] }, { status: 404 })
  }

  // Haal artikelen op van afgelopen 30 dagen (ruimer voor test)
  const artikelen = await fetchArtikelen(bronnen, 30)

  if (!artikelen.length) {
    return NextResponse.json({ error: 'Bronnen gevonden maar geen recente artikelen opgehaald. De feeds zijn mogelijk tijdelijk onbereikbaar.', bronnen: bronnen.map(b => b.naam) }, { status: 404 })
  }

  const beheerUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/voorkeuren?token=${profiel.token}`
  const resultaat = await genereerNieuwsbrief(artikelen, {
    naam: profiel.naam,
    vakgebied: profiel.vakgebied,
    branche: profiel.branche ?? undefined,
    organisatie: profiel.organisatie,
    land: profiel.land ?? 'NL',
    voorkeuren: profiel.voorkeuren ?? undefined,
  }, beheerUrl)

  if (!resultaat) {
    return NextResponse.json({ error: 'Claude vond geen relevante updates in de gevonden artikelen', aantalArtikelen: artikelen.length }, { status: 404 })
  }

  // Verstuur de testmail
  const { error } = await resend.emails.send({
    from: `Brieft Test <newsletter@${process.env.EMAIL_DOMEIN}>`,
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
    bronnen: bronnen.map(b => b.naam),
    email,
  })
}
