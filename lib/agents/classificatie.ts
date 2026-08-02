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

// Vanaf welke score een artikel de redactie in gaat. Hoort hier thuis en niet in
// redactie.ts, omdat de fail-open fallback hieronder dezelfde waarde moet gebruiken.
// Op 4 kwam vrijwel alles door: met brede bronnen als EUR-Lex leverde dat
// nieuwsbrieven vol sanctie- en landbouwwetgeving op. 6 = "duidelijk relevant".
export const RELEVANTIE_DREMPEL = 6

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
        // 25 artikelen × score + reden past niet in 1500 tokens; dan kapt het model
        // midden in de JSON af en faalt JSON.parse met een onleesbare fout.
        // max_tokens is een plafond, geen kostenpost — je betaalt alleen wat wordt gegenereerd.
        max_tokens: 8000,
        system: `Je beoordeelt de relevantie van nieuwsartikelen voor dit vakgebied: ${vakgebiedContext}.

Antwoord UITSLUITEND met een JSON-array, geen andere tekst:
[{"index": 0, "relevantiescore": 0-10, "reden": "korte reden in maximaal 1 zin"}]

Beoordeel elk aangeleverd item op zijn index met deze schaal:
9-10 = raakt de dagelijkse praktijk van deze professional direct; hij moet er iets mee
6-8  = duidelijk relevant voor zijn vakgebied, al vraagt het niet meteen actie
3-5  = zijdelings; hetzelfde land of dezelfde sector, maar niet zijn werkterrein
0-2  = geen aantoonbaar verband met zijn vakgebied

WEES STRENG. De bronnen zijn breed en bevatten veel wetgeving die niets met dit
vakgebied te maken heeft. Een item over een ander beleidsterrein — sancties,
buitenlands beleid, landbouw, visserij, defensie — is niet relevant, ook niet als
het formeel wetgeving is. Kun je niet concreet benoemen wát deze professional
ermee moet, dan is de score maximaal 3.

Een lage score is geen probleem: liever een korte, scherpe nieuwsbrief dan een
lange met ruis.`,
        messages: [{ role: 'user', content: lijst }],
      }),
    })
    const data = await response.json()
    if (data.error) throw new Error(JSON.stringify(data.error))
    if (data.stop_reason === 'max_tokens') {
      throw new Error(`antwoord afgekapt op max_tokens (${artikelen.length} artikelen) — verhoog max_tokens of verklein de batch`)
    }

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
    // Fail-open: bij een classificatiefout krijgt elk item precies de drempel,
    // zodat de redactie-agent alsnog kan beoordelen i.p.v. dat de hele run stopt.
    // Deze score MOET gelijk lopen met RELEVANTIE_DREMPEL — hij stond hier vast op
    // 5 terwijl de drempel naar 6 ging, waardoor een classificatiefout gegarandeerd
    // in "geen relevante updates" eindigde in plaats van in een leesbare fout.
    return artikelen.map(a => ({ ...a, relevantiescore: RELEVANTIE_DREMPEL, reden: 'classificatie mislukt — fallback' }))
  }
}
