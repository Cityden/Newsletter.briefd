import { fetchArtikelen, type Artikel } from '@/lib/fetcher'
import { logAgentRun, timer } from './logging'

// Scout-agent (automatiseringsplan domein 1, agent 1).
// Haalt ruwe artikelen op uit de bronnenlijst en gooit weg wat verderop toch
// sneuvelt.

// Onder deze lengte is een samenvatting geen brontekst maar hooguit een label.
// Rechtspraak levert 50-400 tekens; EUR-Lex levert een lege description.
const MIN_BRONTEKST = 40

// Een item zonder brontekst kán de kwaliteitscontrole niet halen: die verifieert
// de samenvatting tegen de bron, en zonder bron is er niets te verifiëren. Ze
// eerder wegfilteren scheelt niet alleen ruis maar ook geld — in een testrun
// schreef de redactie 54 items waarvan er 3 overleefden, en voor alle 54 is
// zowel het schrijven als het controleren betaald.
//
// Gevolg: bronnen die alleen titels publiceren (EUR-Lex) dragen niets bij totdat
// de fetcher hun brontekst kan ophalen. Dat is eerlijker dan items produceren
// waarvan het model de details moet verzinnen.
function heeftBruikbareBrontekst(a: Artikel): boolean {
  return a.samenvatting.trim().length >= MIN_BRONTEKST
}

export async function scoutAgent(
  bronnen: { naam: string; url: string }[],
  dagenTerug: number,
  subscriberId: string
): Promise<Artikel[]> {
  const stop = timer()
  try {
    const ruw = await fetchArtikelen(bronnen, dagenTerug)
    const artikelen = ruw.filter(heeftBruikbareBrontekst)
    const zonderBrontekst = ruw.length - artikelen.length

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
