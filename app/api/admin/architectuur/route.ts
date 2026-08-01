import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { sessionToken } from '@/lib/auth'
import type { AgentStatus, StatusMap } from '@/lib/architectuur'

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === sessionToken(adminPassword)
}

// Levert per agent alleen de samenvatting die de architectuurkaart nodig heeft:
// de laatste run en hoe vaak het de afgelopen week misging. Bewust apart van
// /api/admin/agents, dat de volledige runlijst teruggeeft — die is te zwaar om
// bij elke keer openklappen van de kaart op te halen.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Geen datumfilter: een agent die al drie weken stil is moet juist zichtbaar
  // blijven met zijn laatste bekende run, anders is "stil" niet te onderscheiden
  // van "bestaat nog niet".
  const { data, error } = await supabase
    .from('agent_runs')
    .select('agent, status, reden, duration_ms, aangemaakt_op')
    .order('aangemaakt_op', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[admin/architectuur]', error.message)
    return NextResponse.json({ error: error.message, agents: {} }, { status: 500 })
  }

  const grens = Date.now() - 7 * 24 * 60 * 60 * 1000
  const agents: StatusMap = {}

  for (const run of data ?? []) {
    const naam = run.agent as string
    if (!naam) continue

    let s: AgentStatus | undefined = agents[naam]
    if (!s) {
      // Eerste keer dat we deze agent zien; door de sortering is dit meteen
      // zijn meest recente run.
      s = {
        laatsteStatus: run.status ?? null,
        laatsteRun: run.aangemaakt_op ?? null,
        duurMs: run.duration_ms ?? null,
        reden: run.reden ?? null,
        runs7d: 0,
        mislukt7d: 0,
      }
      agents[naam] = s
    }

    if (run.aangemaakt_op && new Date(run.aangemaakt_op).getTime() >= grens) {
      s.runs7d += 1
      if (run.status === 'mislukt' || run.status === 'geëscaleerd') s.mislukt7d += 1
    }
  }

  return NextResponse.json({ agents })
}
