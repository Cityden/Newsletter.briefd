import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getBronnen } from '@/lib/sources'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { naam, email, vakgebied, organisatie, frequentie } = body

  if (!naam || !email || !vakgebied || !organisatie || !frequentie) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
  }

  if (!['zzp', 'mkb', 'groot', 'overheid'].includes(organisatie)) {
    return NextResponse.json({ error: 'Ongeldig organisatietype' }, { status: 400 })
  }

  if (!['wekelijks', 'maandelijks'].includes(frequentie)) {
    return NextResponse.json({ error: 'Ongeldige frequentie' }, { status: 400 })
  }

  // Haal bronnen op voor dit vakgebied en sla ze op
  const bronnen = await getBronnen(vakgebied)

  const { error } = await supabase.from('subscribers').upsert({
    naam,
    email,
    vakgebied,
    organisatie,
    frequentie,
    actief: true,
    bronnen,
    bronnen_gegenereerd_op: new Date().toISOString(),
  }, { onConflict: 'email' })

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Aanmelden mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
