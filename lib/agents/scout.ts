import { fetchArtikelen, type Artikel } from '@/lib/fetcher'
import { logAgentRun, timer } from './logging'

// Scout-agent (automatiseringsplan domein 1, agent 1).
// Haalt ruwe artikelen op uit de bronnenlijst en gooit weg wat verderop toch
// sneuvelt.

// Onder deze lengte is een samenvatting geen brontekst maar hooguit een label.
// Rechtspraak levert 50-400 tekens; EUR-Lex levert een lege description.
const MIN_BRONTEKST = 40

// Items zonder brontekst gaan hier NIET weg: de redactie-agent haalt die tekst
// alsnog op, maar alleen voor artikelen die de relevantiedrempel halen. Anders
// zou je 44 documenten ophalen voor de 12 die je gebruikt.
//
// Wel geteld, want dit getal is een waarschuwing die de bronwachter niet kan
// geven: een feed die keurig 25 items teruggeeft maar alleen titels, geldt daar
// als gezond terwijl hij in de praktijk niets bijdraagt.
export function heeftBruikbareBrontekst(a: Artikel): boolean {
  return a.samenvatting.trim().length >= MIN_BRONTEKST
}

export async function scoutAgent(
  bronnen: { naam: string; url: string }[],
  dagenTerug: number,
  subscriberId: string
): Promise<Artikel[]> {
  const stop = timer()
  try {
    const artikelen = await fetchArtikelen(bronnen, dagenTerug)
    const zonderBrontekst = artikelen.filter(a => !heeftBruikbareBrontekst(a)).length

    await logAgentRun({
      agent: 'scout',
      inputRef: subscriberId,
      output: {
        aantalBronnen: bronnen.length,
        aantalArtikelen: artikelen.length,
        // Zichtbaar in de audit trail: loopt dit op, dan levert een bron alleen
        // nog titels en is hij in de praktijk waardeloos geworden.
        zonderBrontekst,
      },
      status: 'gelukt',
      durationMs: stop(),
    })
    return artikelen
  } catch (err) {
    await logAgentRun({
      agent: 'scout',
      inputRef: subscriberId,
      status: 'mislukt',
      reden: err instanceof Error ? err.message : String(err),
      durationMs: stop(),
    })
    return []
  }
}
