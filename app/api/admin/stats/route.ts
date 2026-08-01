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

  const [{ data: logs, error: logsError }, { data: subs }] = await Promise.all([
    supabase
      .from('nieuwsbrief_log')
      .select('id, subscriber_id, onderwerp, status, verstuurd_op')
      .order('verstuurd_op', { ascending: false }),
    supabase
      .from('subscribers')
      .select('id, naam, email, vakgebied, frequentie'),
  ])

  if (logsError) {
    console.error('[admin/stats] nieuwsbrief_log ophalen mislukt:', logsError.message)
    return NextResponse.json({ error: `Database fout: ${logsError.message}` }, { status: 500 })
  }

  const subMap = Object.fromEntries((subs ?? []).map(s => [s.id, s]))

  const result = (logs ?? []).map(log => ({
    ...log,
    subscribers: subMap[log.subscriber_id] ?? null,
  }))

  return NextResponse.json(result)
}
