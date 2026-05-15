import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { sessionToken } from '@/lib/auth'

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === sessionToken(adminPassword)
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('nieuwsbrief_log')
    .select('id, subscriber_id, onderwerp, status, created_at, subscribers(naam, email, vakgebied, frequentie)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
