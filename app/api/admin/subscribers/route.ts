import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === adminPassword
}

export async function GET(_req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, organisatie, frequentie, actief, aangemeld_op, laatste_mail_op')
    .order('aangemeld_op', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json(data)
}
