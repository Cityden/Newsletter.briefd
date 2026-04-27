export interface Artikel {
  titel: string
  url: string
  samenvatting: string
  gepubliceerdOp: string
  bron: string
}

function get(xml: string, tag: string): string {
  return (
    xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1] ??
    xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ??
    ''
  ).trim()
}

function getLinkAtom(itemXml: string): string {
  // Atom: <link href="..." rel="alternate"/> of <link href="..."/>
  return (
    itemXml.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/)?.[1] ??
    itemXml.match(/<link[^>]+href=["']([^"']+)["']/)?.[1] ??
    get(itemXml, 'link') ??
    ''
  ).trim()
}

function parseRSS(xml: string, bronnaam: string): Artikel[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []
  return items.slice(0, 15).map(item => ({
    titel: get(item, 'title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
    url: get(item, 'link').trim(),
    samenvatting: get(item, 'description').replace(/<[^>]+>/g, '').trim().slice(0, 500),
    gepubliceerdOp: get(item, 'pubDate') || get(item, 'dc:date') || '',
    bron: bronnaam,
  })).filter(a => a.titel && a.url)
}

function parseAtom(xml: string, bronnaam: string): Artikel[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? []
  return entries.slice(0, 15).map(entry => ({
    titel: get(entry, 'title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
    url: getLinkAtom(entry),
    samenvatting: (get(entry, 'summary') || get(entry, 'content')).replace(/<[^>]+>/g, '').trim().slice(0, 500),
    gepubliceerdOp: get(entry, 'published') || get(entry, 'updated') || '',
    bron: bronnaam,
  })).filter(a => a.titel && a.url)
}

async function fetchFeed(url: string, bronnaam: string): Promise<Artikel[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Briefd-Nieuwsbrief/1.0 (+https://briefd.nl)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.error(`[fetchFeed] ${bronnaam} HTTP ${res.status} voor ${url}`)
      return []
    }

    const xml = await res.text()
    console.log(`[fetchFeed] ${bronnaam} XML-lengte: ${xml.length} bytes`)

    // Detecteer Atom vs RSS
    const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')
    const artikelen = isAtom ? parseAtom(xml, bronnaam) : parseRSS(xml, bronnaam)
    console.log(`[fetchFeed] ${bronnaam} geparseerd: ${artikelen.length} artikelen`)
    return artikelen
  } catch (err) {
    console.error(`[fetchFeed] ${bronnaam} fout bij ophalen ${url}:`, err)
    return []
  }
}

function isRecent(datumStr: string, dagenTerug: number): boolean {
  if (!datumStr) return true
  const datum = new Date(datumStr)
  if (isNaN(datum.getTime())) return true
  const grens = new Date()
  grens.setDate(grens.getDate() - dagenTerug)
  return datum >= grens
}

export async function fetchArtikelen(
  bronnen: { naam: string; url: string }[],
  dagenTerug = 7
): Promise<Artikel[]> {
  const results = await Promise.allSettled(
    bronnen.map(b => fetchFeed(b.url, b.naam))
  )

  const alle = results
    .filter((r): r is PromiseFulfilledResult<Artikel[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  console.log(`[fetchArtikelen] Totaal voor datumfilter: ${alle.length}, dagenTerug: ${dagenTerug}`)
  const recent = alle.filter(a => isRecent(a.gepubliceerdOp, dagenTerug))
  console.log(`[fetchArtikelen] Na datumfilter: ${recent.length}`)

  const gezien = new Set<string>()
  return recent.filter(a => {
    if (gezien.has(a.url)) return false
    gezien.add(a.url)
    return true
  })
}
