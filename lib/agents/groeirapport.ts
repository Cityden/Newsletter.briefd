import { supabase } from '@/lib/supabase'
import { stuurRapportMail } from './alert'
import { logAgentRun, timer } from './logging'

// Groeirapport-agent (automatiseringsplan domein 2 — marketing & groei).
//
// Eerlijke kanttekening t.o.v. het plan: "meest gelezen vakgebieden" zou
// open-tracking vereisen (een Resend-webhook die opens terugschrijft naar
// Supabase — die integratie bestaat nog niet). Wat deze agent wél kan meten
// zonder nieuwe infrastructuur is de vakgebied-VERDELING onder actieve
// abonnees. Dat is een andere metric dan "meest gelezen" en wordt ook zo
// benoemd in het rapport, om niets te suggereren dat niet gemeten wordt.

export async function groeirapportAgent(): Promise<void> {
  const stop = timer()
  const nu = new Date()
  const startVanMaand = new Date(nu.getFullYear(), nu.getMonth(), 1).toISOString()

  try {
    const [nieuwRes, opgezegdRes, actiefRes, vakgebiedRes] = await Promise.all([
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).gte('aangemeld_op', startVanMaand),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).gte('opgezegd_op', startVanMaand),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('actief', true),
      supabase.from('subscribers').select('vakgebied').eq('actief', true),
    ])

    const telling: Record<string, number> = {}
    for (const row of vakgebiedRes.data ?? []) {
      const v = row.vakgebied || 'onbekend'
      telling[v] = (telling[v] ?? 0) + 1
    }
    const top5 = Object.entries(telling).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const maandLabel = nu.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    const regels = [
      `Nieuwe aanmeldingen deze maand: <strong>${nieuwRes.count ?? 0}</strong>`,
      `Opzeggingen deze maand: <strong>${opgezegdRes.count ?? 0}</strong>`,
      `Totaal actieve abonnees: <strong>${actiefRes.count ?? 0}</strong>`,
      `<strong>Vakgebied-verdeling onder actieve abonnees (top 5):</strong>`,
      ...top5.map(([v, n]) => `${v}: ${n}`),
      `<em>Let op: dit is verdeling, geen leesgedrag — open-tracking is nog niet aangesloten.</em>`,
    ]

    await stuurRapportMail(`Maandrapport ${maandLabel}`, regels)

    await logAgentRun({
      agent: 'groeirapport',
      inputRef: 'monthly-report',
      output: { nieuw: nieuwRes.count ?? 0, opgezegd: opgezegdRes.count ?? 0, totaalActief: actiefRes.count ?? 0 },
      status: 'gelukt',
      durationMs: stop(),
    })
  } catch (err) {
    await logAgentRun({
      agent: 'groeirapport',
      inputRef: 'monthly-report',
      status: 'mislukt',
      reden: err instanceof Error ? err.message : String(err),
      durationMs: stop(),
    })
  }
}
