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

  const zeven = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: recenteRuns, error: runsError },
    { data: rectificaties, error: rectificatiesError },
    { data: concepten, error: conceptenError },
  ] = await Promise.all([
    supabase
      .from('agent_runs')
      .select('id, agent, input_ref, status, reden, output, duration_ms, aangemaakt_op')
      .gte('aangemaakt_op', zeven)
      .order('aangemaakt_op', { ascending: false })
      .limit(100),
    supabase
      .from('gepubliceerde_items')
      .select('id, titel, bron_naam, bron_url, rectificatie_notitie, laatst_gecontroleerd_op')
      .eq('status', 'rectificatie_nodig'),
    supabase
      .from('concept_nieuwsbrieven')
      .select('batch_token, status, naam, email, onderwerp, aangemaakt_op, items_preview')
      .order('aangemaakt_op', { ascending: false })
      .limit(50),
  ])

  // Zonder deze meldingen is een ontbrekende tabel of een rechtenprobleem in het
  // dashboard niet te onderscheiden van "er is nog niets gebeurd".
  const fouten = [
    runsError && `agent_runs: ${runsError.message}`,
    rectificatiesError && `gepubliceerde_items: ${rectificatiesError.message}`,
    conceptenError && `concept_nieuwsbrieven: ${conceptenError.message}`,
  ].filter(Boolean) as string[]

  if (fouten.length > 0) console.error('[admin/agents]', fouten.join(' | '))

  return NextResponse.json({
    recenteRuns: recenteRuns ?? [],
    rectificaties: rectificaties ?? [],
    concepten: concepten ?? [],
    fouten,
  })
}
