import { fetchArtikelen, type Artikel } from '@/lib/fetcher'
import { logAgentRun, timer } from './logging'

// Scout-agent (automatiseringsplan domein 1, agent 1).
// Haalt ruwe artikelen op uit de bronnenlijst. Logica ongewijzigd t.o.v. fetchArtikelen —
// deze wrapper voegt alleen de audit-trail toe.

export async function scoutAgent(
  bronnen: { naam: string; url: string }[],
  dagenTerug: number,
  subscriberId: string
): Promise<Artikel[]> {
  const stop = timer()
  try {
    const artikelen = await fetchArtikelen(bronnen, dagenTerug)
    await logAgentRun({
      agent: 'scout',
      inputRef: subscriberId,
      output: { aantalBronnen: bronnen.length, aantalArtikelen: artikelen.length },
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
