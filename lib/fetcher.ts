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

// In XML staan URL's met ge-escapete ampersands (&amp;). Zonder decoderen krijg je
// links als ?id=ECLI:...&amp;pk_campaign=rss, waarin de parameter letterlijk
// "amp;pk_campaign" gaat heten. Dat levert kapotte bronlinks in de nieuwsbrief op,
// én de redactie-agent geeft de URL gedecodeerd terug, waardoor de
// kwaliteitscontrole hem niet meer herkent en het item afkeurt.
function decodeEntiteiten(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&') // als laatste, anders wordt &amp;lt; dubbel gedecodeerd
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
  return items.slice(0, 25).map(item => ({
    titel: decodeEntiteiten(get(item, 'title')),
    url: decodeEntiteiten(get(item, 'link').trim()),
    samenvatting: get(item, 'description').replace(/<[^>]+>/g, '').trim().slice(0, 500),
    gepubliceerdOp: get(item, 'pubDate') || get(item, 'dc:date') || '',
    bron: bronnaam,
  })).filter(a => a.titel && a.url)
}

function parseAtom(xml: string, bronnaam: string): Artikel[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? []
  return entries.slice(0, 25).map(entry => ({
    titel: decodeEntiteiten(get(entry, 'title')),
    url: decodeEntiteiten(getLinkAtom(entry)),
    samenvatting: (get(entry, 'summary') || get(entry, 'content')).replace(/<[^>]+>/g, '').trim().slice(0, 500),
    gepubliceerdOp: get(entry, 'published') || get(entry, 'updated') || '',
    bron: bronnaam,
  })).filter(a => a.titel && a.url)
}

// Sommige feeds leveren alleen een titel en geen description — EUR-Lex is het
// duidelijkste voorbeeld. Zonder brontekst kan de kwaliteitscontrole niets
// verifiëren, dus zulke items sneuvelen altijd. Deze functie haalt de tekst
// alsnog op, zodat die bronnen wél bruikbaar worden.
//
// Alleen aanroepen voor artikelen die de relevantiedrempel al hebben gehaald:
// het is een extra HTTP-verzoek per artikel.
const MAX_BRONTEKST = 2000

export async function haalBrontekstOp(url: string): Promise<string> {
  // De portaalpagina van EUR-Lex is ~1,9 miljoen tekens navigatie plus het hele
  // document. De TXT/HTML-variant geeft alleen de documenttekst zelf.
  const celex = url.match(/CELEX[:%]3?A?([0-9A-Z()]+)/i)?.[1]
  const doelUrl = celex
    ? `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`
    : url

  try {
    const res = await fetch(doelUrl, {
      headers: { 'User-Agent': 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''

    const html = await res.text()
    // Ruwe maar voorspelbare extractie: navigatie en scripts eruit, dan tags weg.
    const tekst = html
      .replace(/<(script|style|nav|header|footer|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return tekst.slice(0, MAX_BRONTEKST)
  } catch {
    return ''
  }
}

async function fetchFeed(url: string, bronnaam: string): Promise<Artikel[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)' },
      // 20s, niet 10s: reclamecode.nl doet er consistent ~11,5 seconde over.
      // Op 10s viel die bron altijd af, en omdat een mislukte feed alleen wordt
      // gelogd merkte je daar niets van. Feeds worden parallel opgehaald, dus een
      // trage bron vertraagt de run niet.
      signal: AbortSignal.timeout(20000),
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
