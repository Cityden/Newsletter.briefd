import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/subscribers/[token] — profiel ophalen
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params

  const { data, error } = await supabase
    .from('subscribers')
    .select('naam, email, vakgebied, organisatie, frequentie, actief, voorkeuren')
    .eq('token', token)
    .single()

  if (error?.code === 'PGRST116' || !data) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH /api/subscribers/[token] — voorkeuren bijwerken
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  const body = await req.json()

  const toegestaan = ['vakgebied', 'organisatie', 'frequentie', 'actief', 'voorkeuren']
  const update: Record<string, unknown> = {}

  for (const key of toegestaan) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Geen geldige velden' }, { status: 400 })
  }

  if ('organisatie' in update && !['zzp', 'mkb', 'groot', 'overheid'].includes(update.organisatie as string)) {
    return NextResponse.json({ error: 'Ongeldig organisatietype' }, { status: 400 })
  }

  if ('frequentie' in update && !['wekelijks', 'maandelijks'].includes(update.frequentie as string)) {
    return NextResponse.json({ error: 'Ongeldige frequentie' }, { status: 400 })
  }

  const { error } = await supabase
    .from('subscribers')
    .update(update)
    .eq('token', token)

  if (error) {
    console.error('Supabase update error:', error)
    return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
