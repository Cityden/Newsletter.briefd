import type { RedactieResultaat, RedactieItem } from './redactie'
import type { GeclassificeerdArtikel } from './classificatie'
import { logAgentRun, timer } from './logging'

// Kwaliteitscontrole-agent (automatiseringsplan domein 1, agent 4 + sectie 2b).
// NIEUW — dit bestaat nog nergens in de huidige codebase. Dit is het belangrijkste
// vangnet tegen hallucinaties: een aparte agent, met een strengere prompt dan de
// redactie-agent, legt elke samenvatting naast de oorspronkelijke brontekst.
//
// Regel uit het plan: "Escaleren bij twijfel, nooit gokken." Bij afwijking of een
// mislukte check gaat een item NIET automatisch de nieuwsbrief in.
//
// Kostenkanttekening: dit doet één Claude-call per item (niet gebatcht), dus de
// kosten schalen lineair met het aantal items per run. Zie het businessplan voor
// de impact hiervan op de unit economics — batchen per subscriber-run is de
// voor de hand liggende volgende optimalisatie zodra volume dat rechtvaardigt.

export interface QCResultaat {
  goedgekeurd: RedactieItem[]
  afgekeurd: { item: RedactieItem; reden: string }[]
}

export async function kwaliteitscontroleAgent(
  redactie: RedactieResultaat,
  bronArtikelen: GeclassificeerdArtikel[],
  subscriberId: string
): Promise<QCResultaat> {
  const stop = timer()
  const goedgekeurd: RedactieItem[] = []
  const afgekeurd: { item: RedactieItem; reden: string }[] = []
  // Eén call per item (zie kanttekening hierboven) — dit is de daadwerkelijke
  // kostenpost van de run, dus optellen i.p.v. schatten.
  let tokensIn = 0
  let tokensUit = 0

  // Exacte string-vergelijking keurde items af op puur cosmetische verschillen
  // (een gedecodeerde &, een afsluitende slash). Het doel is een verzonnen URL
  // betrappen, niet een herschreven ampersand — dus normaliseren vóór vergelijken.
  const normaliseerUrl = (u: string) =>
    u.trim().replace(/&amp;/g, '&').replace(/\/+$/, '').toLowerCase()

  for (const item of redactie.items) {
    const bron = bronArtikelen.find(a => normaliseerUrl(a.url) === normaliseerUrl(item.bronUrl))
    if (!bron) {
      // bronUrl komt niet voor in de aangeleverde artikelen — mogelijk verzonnen door de redactie-agent
      afgekeurd.push({ item, reden: 'bronUrl niet gevonden in aangeleverde artikelen' })
      continue
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: `Je bent een strenge fact-checker. Vergelijk de SAMENVATTING met de BRONTEKST.
Markeer elk feit, cijfer, bedrag, datum of bewering in de samenvatting dat niet
letterlijk (of als directe parafrase) terug te vinden is in de brontekst.

Antwoord UITSLUITEND met JSON, geen andere tekst:
{"akkoord": true of false, "afwijkingen": ["korte beschrijving per afwijking"]}

Wees streng: bij twijfel is akkoord=false.`,
          messages: [
            {
              role: 'user',
              content: `BRONTEKST:\n${bron.samenvatting}\n\nSAMENVATTING (te checken):\n${item.samenvatting}\n\nACTIE (te checken):\n${item.actie}`,
            },
          ],
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(JSON.stringify(data.error))
      tokensIn += data.usage?.input_tokens ?? 0
      tokensUit += data.usage?.output_tokens ?? 0
      if (data.stop_reason === 'max_tokens') {
        // Bij twijfel afkeuren, niet gokken: een afgekapt antwoord is geen goedkeuring.
        afgekeurd.push({ item, reden: 'controle-antwoord afgekapt op max_tokens' })
        continue
      }

      const tekst = data.content?.[0]?.text ?? '{}'
      const clean = tekst.replace(/```json|```/g, '').trim()
      const check: { akkoord: boolean; afwijkingen: string[] } = JSON.parse(clean)

      if (check.akkoord) {
        goedgekeurd.push(item)
      } else {
        afgekeurd.push({ item, reden: check.afwijkingen?.join('; ') || 'afwijking gedetecteerd' })
      }
    } catch (err) {
      // Escaleren bij twijfel, nooit gokken: een mislukte check = NIET goedgekeurd, ook al ligt
      // dat mogelijk aan een API-fout i.p.v. de content zelf. Beter een item later dan fout publiceren.
      afgekeurd.push({
        item,
        reden: `fact-check mislukt (technische fout): ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  await logAgentRun({
    agent: 'kwaliteitscontrole',
    inputRef: subscriberId,
    output: { goedgekeurd: goedgekeurd.length, afgekeurd: afgekeurd.length, tokens: { in: tokensIn, uit: tokensUit } },
    status: afgekeurd.length > 0 ? 'geëscaleerd' : 'gelukt',
    reden: afgekeurd.length > 0 ? afgekeurd.map(a => a.reden).join(' | ').slice(0, 500) : undefined,
    durationMs: stop(),
  })

  return { goedgekeurd, afgekeurd }
}
