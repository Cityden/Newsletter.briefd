import { RELEVANTIE_DREMPEL, type GeclassificeerdArtikel } from './classificatie'
import { bepaalTaal, uitlegVakgebied, saniteerVoorPrompt, type Profiel } from '@/lib/generator'
import { haalBrontekstOp } from '@/lib/fetcher'
import { heeftBruikbareBrontekst } from './scout'
import { AgentFout, logAgentRun, timer } from './logging'

// Redactie-agent (automatiseringsplan domein 1, agent 3).
// T.o.v. de oude genereerNieuwsbrief(): deze agent selecteert niet meer zelf —
// dat is nu het werk van de classificatie-agent. De redactie-agent schrijft alleen
// nog, en krijgt de expliciete instructie om nooit verder te gaan dan de brontekst
// (zie automatiseringsplan sectie 2b, punt 1 en 2: "brontekst nooit loslaten").


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
  const kandidaten = artikelen.filter(a => a.relevantiescore >= RELEVANTIE_DREMPEL)
  if (kandidaten.length === 0) return null

  const stop = timer()

  // Verrijking: feeds als EUR-Lex leveren alleen een titel. Zonder brontekst moet
  // het model de details verzinnen en keurt de kwaliteitscontrole het item terecht
  // af — in een testrun overleefden 3 van de 54 items. Hier halen we die tekst
  // alsnog op, maar pas nu: alleen voor wat de relevantiedrempel haalde, dus een
  // handvol verzoeken in plaats van tientallen.
  const verrijkt = await Promise.all(kandidaten.map(async a => {
    if (heeftBruikbareBrontekst(a)) return a
    const tekst = await haalBrontekstOp(a.url)
    return tekst ? { ...a, samenvatting: tekst } : a
  }))

  // Wat ook na verrijking geen brontekst heeft, gaat eruit: daar valt niets over
  // te schrijven dat de controle overleeft.
  const relevant = verrijkt.filter(heeftBruikbareBrontekst)
  const aantalVerrijkt = verrijkt.filter((a, i) => a.samenvatting !== kandidaten[i].samenvatting).length
  const zonderTekstWeg = verrijkt.length - relevant.length

  if (relevant.length === 0) {
    await logAgentRun({
      agent: 'redactie',
      inputRef: subscriberId,
      status: 'geëscaleerd',
      reden: `alle ${kandidaten.length} relevante items misten brontekst, ook na verrijking`,
      durationMs: stop(),
    })
    return null
  }
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
        // Een volle nieuwsbrief (10-15 items met samenvatting en actie) loopt ruim
        // over 4000 tokens heen; het model kapte dan midden in de JSON af.
        max_tokens: 16000,
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
    if (data.stop_reason === 'max_tokens') {
      throw new Error(`antwoord afgekapt op max_tokens (${relevant.length} relevante items) — verhoog max_tokens of verklein de batch`)
    }

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
      throw new AgentFout('redactie', 'model retourneerde geen items')
    }

    await logAgentRun({
      agent: 'redactie',
      inputRef: subscriberId,
      output: {
        aantalItems: parsed.items.length,
        verrijkt: aantalVerrijkt,
        zonderTekstWeg,
        // Echte tokens uit de API-respons, zodat kosten gemeten worden i.p.v. geschat.
        tokens: { in: data.usage?.input_tokens, uit: data.usage?.output_tokens },
      },
      status: 'gelukt',
      durationMs: stop(),
    })
    return parsed
  } catch (err) {
    if (err instanceof AgentFout) throw err // al gelogd hierboven
    const reden = err instanceof Error ? err.message : String(err)
    await logAgentRun({
      agent: 'redactie',
      inputRef: subscriberId,
      status: 'mislukt',
      reden,
      durationMs: stop(),
    })
    // Geen null: dat betekent "niets relevants gevonden", en dit is een defect.
    throw new AgentFout('redactie', reden)
  }
}
