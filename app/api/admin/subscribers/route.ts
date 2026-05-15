import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { sessionToken } from '@/lib/auth'

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === sessionToken(adminPassword)
}

export async function GET(_req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, branche, organisatie, frequentie, actief, aangemeld_op, laatste_mail_op')
    .order('aangemeld_op', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, branche } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'ID vereist' }, { status: 400 })
  }

  const { error } = await supabase
    .from('subscribers')
    .update({ branche: branche ?? null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'ID vereist' }, { status: 400 })
  }

  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
