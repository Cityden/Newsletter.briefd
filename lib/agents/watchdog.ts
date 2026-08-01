import { supabase } from '@/lib/supabase'
import { stuurAlertMail } from './alert'
import { logAgentRun, timer } from './logging'

// Watchdog-agent (automatiseringsplan fase 3 — backoffice-fundament).
// agent_runs werd al beschreven door alle vijf content-agents, maar nooit
// gelezen: je moest zelf inloggen op /admin om te zien of er iets misging.
// Deze agent checkt dagelijks en stuurt ALLEEN een mail bij problemen —
// een stille cron blijft dus stil, geen dagelijkse ruis.

const STILLE_CRON_VENSTER_DAGEN = 8 // ruim boven de wekelijkse cyclus (maandelijkse abonnees maken dit lastiger te vangen op 24u)
const MAX_REGELS_IN_MAIL = 30

export async function watchdogAgent(): Promise<{ ok: boolean; problemen: number; stilleCron: boolean }> {
  const stop = timer()
  const sinds24u = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: mislukt, error } = await supabase
    .from('agent_runs')
    .select('agent, input_ref, status, reden, aangemaakt_op')
    .in('status', ['mislukt', 'geëscaleerd'])
    .gte('aangemaakt_op', sinds24u)

  if (error) {
    await logAgentRun({
      agent: 'watchdog',
      inputRef: 'daily-check',
      status: 'mislukt',
      reden: error.message,
      durationMs: stop(),
    })
    // Kan de watchdog zelf niet draaien? Dat is zelf ook alert-waardig.
    await stuurAlertMail('Watchdog kon agent_runs niet uitlezen', [
      `Database-fout: <code>${error.message}</code>`,
    ])
    return { ok: false, problemen: 0, stilleCron: false }
  }

  const problemen = mislukt ?? []

  // Detecteer een cron die helemaal niet gedraaid heeft — de meest waardevolle check,
  // want een pipeline die nooit start logt ook geen "mislukt" ergens.
  const grensStilleCron = new Date(Date.now() - STILLE_CRON_VENSTER_DAGEN * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentAantal } = await supabase
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .gte('aangemaakt_op', grensStilleCron)

  const stilleCron = (recentAantal ?? 0) === 0

  if (problemen.length > 0 || stilleCron) {
    const regels: string[] = []
    if (stilleCron) {
      regels.push(
        `Geen enkele agent-run gevonden in de afgelopen ${STILLE_CRON_VENSTER_DAGEN} dagen — de cron is mogelijk niet gedraaid (check CRON_SECRET en de Vercel cron-configuratie).`
      )
    }
    for (const p of problemen.slice(0, MAX_REGELS_IN_MAIL)) {
      regels.push(
        `<code>${p.agent}</code> — ${p.status} — ${p.reden ?? 'geen reden gelogd'} (ref: ${p.input_ref})`
      )
    }
    if (problemen.length > MAX_REGELS_IN_MAIL) {
      regels.push(`...en nog ${problemen.length - MAX_REGELS_IN_MAIL} andere. Volledig overzicht: query agent_runs direct.`)
    }

    await stuurAlertMail(
      `Watchdog: ${problemen.length} probleem${problemen.length !== 1 ? 'en' : ''} in de agent-pipeline${stilleCron ? ' + mogelijk stille cron' : ''}`,
      regels
    )
  }

  await logAgentRun({
    agent: 'watchdog',
    inputRef: 'daily-check',
    output: { problemen: problemen.length, stilleCron },
    status: problemen.length > 0 || stilleCron ? 'geëscaleerd' : 'gelukt',
    durationMs: stop(),
  })

  return { ok: true, problemen: problemen.length, stilleCron }
}
