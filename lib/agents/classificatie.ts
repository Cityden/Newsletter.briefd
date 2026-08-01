import type { Artikel } from '@/lib/fetcher'
import { logAgentRun, timer } from './logging'

// Classificatie-agent (automatiseringsplan domein 1, agent 2) — NIEUW.
// Voorheen deed de redactie-prompt zowel selectie als schrijven in één call.
// Deze agent scheidt dat: een goedkoop/snel model beoordeelt relevantie per artikel,
// zodat de (duurdere) redactie-agent alleen nog hoeft te schrijven over wat al is
// goedgekeurd. Dit scheelt tokens en maakt de selectie zelf auditeerbaar.

export interface GeclassificeerdArtikel extends Artikel {
  relevantiescore: number // 0-10
  reden: string
}

const MODEL = 'claude-haiku-4-5-20251001' // klein/snel model — classificatie hoeft niet met het zware model

export async function classificatieAgent(
  artikelen: Artikel[],
  vakgebiedContext: string,
  subscriberId: string
): Promise<GeclassificeerdArtikel[]> {
  if (artikelen.length === 0) return []
  const stop = timer()

  const lijst = artikelen
    .map((a, i) => `[${i}] ${a.titel} — ${a.samenvatting.slice(0, 150)}`)
    .join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: `Je beoordeelt de relevantie van nieuwsartikelen voor het vakgebied: ${vakgebiedContext}.
Antwoord UITSLUITEND met een JSON-array, geen andere tekst:
[{"index": 0, "relevantiescore": 0-10, "reden": "korte reden in maximaal 1 zin"}]
Beoordeel elk aangeleverde item op zijn index. 0 = totaal irrelevant, 10 = kernrelevant.
Interpreteer relevantie ruim: ook zijdelings rakende wet- en regelgeving telt mee.`,
        messages: [{ role: 'user', content: lijst }],
      }),
    })
    const data = await response.json()
    if (data.error) throw new Error(JSON.stringify(data.error))

    const tekst = data.content?.[0]?.text ?? '[]'
    const clean = tekst.replace(/```json|```/g, '').trim()
    const scores: { index: number; relevantiescore: number; reden: string }[] = JSON.parse(clean)

    const resultaat = artikelen.map((a, i) => {
      const s = scores.find(s => s.index === i)
      return {
        ...a,
        relevantiescore: s?.relevantiescore ?? 0,
        reden: s?.reden ?? 'geen score ontvangen van classificatie-agent',
      }
    })

    await logAgentRun({
      agent: 'classificatie',
      inputRef: subscriberId,
      output: {
        aantal: resultaat.length,
        relevantAantal: resultaat.filter(r => r.relevantiescore >= 4).length,
      },
      status: 'gelukt',
      durationMs: stop(),
    })
    return resultaat
  } catch (err) {
    await logAgentRun({
      agent: 'classificatie',
      inputRef: subscriberId,
      status: 'mislukt',
      reden: err instanceof Error ? err.message : String(err),
      durationMs: stop(),
    })
    // Fail-open: bij een classificatiefout krijgt elk item een neutrale score,
    // zodat de redactie-agent alsnog kan beoordelen i.p.v. dat de hele run stopt.
    return artikelen.map(a => ({ ...a, relevantiescore: 5, reden: 'classificatie mislukt — fallback' }))
  }
}
