import { supabase } from '@/lib/supabase'

// Eén tabel, alle agents — basis voor de watchdog-agent (fase 3) en voor debugging.
// Zie automatiseringsplan sectie 6: "zonder dit wordt het al snel een black box."

export type AgentNaam =
  | 'scout'
  | 'classificatie'
  | 'redactie'
  | 'kwaliteitscontrole'
  | 'personalisatie'
  | 'watchdog'
  | 'bronwachter'
  | 'herziening'
  | 'groeirapport'
  | 'onboarding'

export type AgentStatus = 'gelukt' | 'mislukt' | 'geëscaleerd'

// Onderscheidt "de agent is stukgelopen" van "er was niets te melden".
//
// Die twee gaven allebei null terug, waardoor een ongeldige API-sleutel, een
// afgekapt antwoord en een rustige nieuwsweek in het dashboard alle drie
// verschenen als "Geen updates". Vier keer op één dag is daardoor een echt
// defect als normaal gedrag gelezen. Een agent die faalt gooit nu deze fout;
// null betekent voortaan uitsluitend: niets relevants gevonden.
export class AgentFout extends Error {
  constructor(public agent: AgentNaam, reden: string) {
    super(reden)
    this.name = 'AgentFout'
  }
}

interface LogInput {
  agent: AgentNaam
  inputRef: string // subscriber-id, artikel-url, of andere traceerbare referentie
  output?: unknown
  status: AgentStatus
  reden?: string // bij mislukt/geëscaleerd: waarom (zichtbaar voor audit trail)
  durationMs?: number
}

export async function logAgentRun(input: LogInput): Promise<void> {
  const { error } = await supabase.from('agent_runs').insert({
    agent: input.agent,
    input_ref: input.inputRef,
    output: input.output ? JSON.stringify(input.output).slice(0, 10000) : null,
    status: input.status,
    reden: input.reden ?? null,
    duration_ms: input.durationMs ?? null,
  })
  if (error) {
    // Logging mag nooit de pipeline zelf breken — alleen loggen naar console als fallback
    console.error(`[agent_runs] Logging mislukt voor agent "${input.agent}":`, error.message)
  }
}

export function timer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}
