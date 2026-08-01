import type { GeclassificeerdArtikel } from './classificatie'
import { bepaalTaal, uitlegVakgebied, saniteerVoorPrompt, type Profiel } from '@/lib/generator'
import { logAgentRun, timer } from './logging'

// Redactie-agent (automatiseringsplan domein 1, agent 3).
// T.o.v. de oude genereerNieuwsbrief(): deze agent selecteert niet meer zelf —
// dat is nu het werk van de classificatie-agent. De redactie-agent schrijft alleen
// nog, en krijgt de expliciete instructie om nooit verder te gaan dan de brontekst
// (zie automatiseringsplan sectie 2b, punt 1 en 2: "brontekst nooit loslaten").

const RELEVANTIE_DREMPEL = 4

export interface RedactieItem {
  titel: string
  impact: 'hoog' | 'gemiddeld' | 'laag'
  type: 'wetgeving' | 'uitspraak' | 'beleid' | 'tarief'
  samenvatting: string
  actie: string
  bronUrl: string
  bronNaam: string
  datum: string
}

export interface RedactieResultaat {
  onderwerp: string
  items: RedactieItem[]
}

export async function redactieAgent(
  artikelen: GeclassificeerdArtikel[],
  profiel: Profiel,
  subscriberId: string
): Promise<RedactieResultaat | null> {
  const relevant = artikelen.filter(a => a.relevantiescore >= RELEVANTIE_DREMPEL)
  if (relevant.length === 0) return null

  const stop = timer()
  const taal = profiel.voorkeuren?.taal || bepaalTaal(profiel.land)
  const vakgebiedContext = uitlegVakgebied(profiel.vakgebied)

  const artikelTekst = relevant
    .map((a, i) =>
      `[${i + 1}] TITEL: ${a.titel}\nBRON: ${a.bron}\nURL: ${a.url}\nDATUM: ${a.gepubliceerdOp}\nSAMENVATTING: ${a.samenvatting}\nRELEVANTIE VOLGENS CLASSIFICATIE-AGENT: ${a.relevantiescore}/10 — ${a.reden}`
    )
    .join('\n\n---\n\n')

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
        max_tokens: 4000,
        system: `Je bent een redactie-agent die regelgevingsupdates schrijft voor professionals.

KRITIEKE REGEL: schrijf UITSLUITEND op basis van de letterlijke brontekst. Nooit aanvullen
vanuit eigen kennis. Elk cijfer, bedrag, percentage, drempel of ingangsdatum moet letterlijk
terug te vinden zijn in de aangeleverde SAMENVATTING — verzin nooit een getal.

Schrijf alle tekstuele content in het ${taal}. JSON-sleutels en vaste waarden
(impact: "hoog"/"gemiddeld"/"laag", type: "wetgeving"/"uitspraak"/"beleid"/"tarief")
blijven altijd exact zoals hieronder gespecificeerd.

Antwoord UITSLUITEND met één geldig JSON-object, geen tekst erbuiten:
{
  "onderwerp": "e-mailonderwerp max 60 tekens",
  "items": [
    {
      "titel": "duidelijke titel",
      "impact": "hoog" of "gemiddeld" of "laag",
      "type": "wetgeving" of "uitspraak" of "beleid" of "tarief",
      "samenvatting": "2-3 zinnen wat dit betekent voor de ontvanger",
      "actie": "concrete actie in 1 zin",
      "bronUrl": "exacte URL uit de lijst",
      "bronNaam": "naam van de bron",
      "datum": "publicatiedatum"
    }
  ]
}`,
        messages: [
          {
            role: 'user',
            content: `Ontvanger: ${saniteerVoorPrompt(profiel.naam)}
Vakgebied: ${saniteerVoorPrompt(profiel.vakgebied)} (${vakgebiedContext})
${profiel.branche ? `Branche: ${saniteerVoorPrompt(profiel.branche)}` : ''}

De classificatie-agent heeft onderstaande items al als relevant beoordeeld (score >= ${RELEVANTIE_DREMPEL}).
Schrijf voor elk item de samenvatting en actie. Retourneer ALLEEN het JSON-object.

${artikelTekst}`,
          },
        ],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(JSON.stringify(data.error))

    const tekst = data.content?.[0]?.text ?? ''
    const clean = tekst.replace(/```json|```/g, '').trim()
    const parsed: RedactieResultaat = JSON.parse(clean)

    if (!parsed.items?.length) {
      await logAgentRun({
        agent: 'redactie',
        inputRef: subscriberId,
        status: 'mislukt',
        reden: 'model retourneerde geen items',
        durationMs: stop(),
      })
      return null
    }

    await logAgentRun({
      agent: 'redactie',
      inputRef: subscriberId,
      output: { aantalItems: parsed.items.length },
      status: 'gelukt',
      durationMs: stop(),
    })
    return parsed
  } catch (err) {
    await logAgentRun({
      agent: 'redactie',
      inputRef: subscriberId,
      status: 'mislukt',
      reden: err instanceof Error ? err.message : String(err),
      durationMs: stop(),
    })
    return null
  }
}
