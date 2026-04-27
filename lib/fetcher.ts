export interface Artikel {
  titel: string
  url: string
  samenvatting: string
  gepubliceerdOp: string
  bron: string
}

// Haal RSS feed op en parse items
async function fetchRSS(url: string, bronnaam: string): Promise<Artikel[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Regelgeving-Nieuwsbrief/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const xml = await res.text()
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []

    return items.slice(0, 10).map(item => {
      const get = (tag: string) =>
        item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1]
        ?? item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
        ?? ''

      const datumStr = get('pubDate') || get('dc:date') || ''
      return {
        titel: get('title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        url: get('link').trim(),
        samenvatting: get('description').replace(/<[^>]+>/g, '').trim().slice(0, 500),
        gepubliceerdOp: datumStr,
        bron: bronnaam,
      }
    }).filter(a => a.titel && a.url)
  } catch {
    return []
  }
}

// Filter artikelen van de afgelopen N dagen
function isRecent(datumStr: string, dagenTerug: number): boolean {
  if (!datumStr) return true // Als geen datum: neem mee
  const datum = new Date(datumStr)
  if (isNaN(datum.getTime())) return true
  const grens = new Date()
  grens.setDate(grens.getDate() - dagenTerug)
  return datum >= grens
}

// Haal alle recente artikelen op uit bronnenlijst
export async function fetchArtikelen(
  bronnen: { naam: string; url: string }[],
  dagenTerug = 7
): Promise<Artikel[]> {
  const results = await Promise.allSettled(
    bronnen.map(b => fetchRSS(b.url, b.naam))
  )

  const alle = results
    .filter((r): r is PromiseFulfilledResult<Artikel[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(a => isRecent(a.gepubliceerdOp, dagenTerug))

  // Dedupliceer op URL
  const gezien = new Set<string>()
  return alle.filter(a => {
    if (gezien.has(a.url)) return false
    gezien.add(a.url)
    return true
  })
}
