import { NextRequest, NextResponse } from 'next/server'
import { getBronnen } from '@/lib/sources'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { vakgebied, branche, land, extraOnderwerpen } = await req.json()

  if (!vakgebied) {
    return NextResponse.json({ error: 'vakgebied is verplicht' }, { status: 400 })
  }

  const bronnen = await getBronnen(vakgebied, {
    branche: branche || undefined,
    extraOnderwerpen: extraOnderwerpen || undefined,
    land: land || 'NL',
  })

  return NextResponse.json({ bronnen, aantalGevonden: bronnen.length })
}
