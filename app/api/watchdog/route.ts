import { NextRequest, NextResponse } from 'next/server'
import { watchdogAgent } from '@/lib/agents/watchdog'
import { bronwachterAgent } from '@/lib/agents/bronwachter'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hangt aan dezelfde dagelijkse cron: de bronwachter is 32 HTTP-verzoeken en
  // vraagt geen eigen schema. Onafhankelijk van elkaar uitgevoerd — een falende
  // bronmeting mag de agent_runs-controle niet tegenhouden, en andersom.
  const [watchdog, bronwachter] = await Promise.allSettled([
    watchdogAgent(),
    bronwachterAgent(),
  ])

  return NextResponse.json({
    watchdog: watchdog.status === 'fulfilled' ? watchdog.value : { fout: String(watchdog.reason) },
    bronwachter: bronwachter.status === 'fulfilled' ? bronwachter.value : { fout: String(bronwachter.reason) },
  })
}
