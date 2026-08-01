import { NextRequest, NextResponse } from 'next/server'
import { watchdogAgent } from '@/lib/agents/watchdog'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resultaat = await watchdogAgent()
  return NextResponse.json(resultaat)
}
