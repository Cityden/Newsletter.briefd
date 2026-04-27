// Vaste bronnenlijst voor bekende vakgebieden
const VASTE_BRONNEN: Record<string, { naam: string; url: string }[]> = {
  fiscaal: [
    { naam: 'Staatscourant', url: 'https://www.officielebekendmakingen.nl/rss/stcrt' },
    { naam: 'Belastingdienst nieuws', url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/nieuwsroom/rss' },
    { naam: 'Rechtspraak belasting', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Belastingrecht' },
    { naam: 'EUR-Lex fiscaal', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-taxation-and-customs-union.xml' },
  ],
  finance: [
    { naam: 'AFM nieuws', url: 'https://www.afm.nl/rss/nieuws' },
    { naam: 'DNB nieuws', url: 'https://www.dnb.nl/rss/nieuws' },
    { naam: 'Staatscourant', url: 'https://www.officielebekendmakingen.nl/rss/stcrt' },
    { naam: 'EUR-Lex financieel', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-economic-and-monetary-affairs.xml' },
  ],
  hr: [
    { naam: 'Rechtspraak arbeidsrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Arbeidsrecht' },
    { naam: 'Rijksoverheid SZW', url: 'https://www.rijksoverheid.nl/ministeries/ministerie-van-sociale-zaken-en-werkgelegenheid/rss' },
    { naam: 'Staatscourant', url: 'https://www.officielebekendmakingen.nl/rss/stcrt' },
    { naam: 'UWV nieuws', url: 'https://www.uwv.nl/nl/rss/nieuws' },
  ],
  privacy: [
    { naam: 'Autoriteit Persoonsgegevens', url: 'https://www.autoriteitpersoonsgegevens.nl/rss/nieuws' },
    { naam: 'Rechtspraak privacy', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
    { naam: 'EUR-Lex privacy', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-justice.xml' },
  ],
  marketing: [
    { naam: 'ACM nieuws', url: 'https://www.acm.nl/rss/nieuws' },
    { naam: 'Autoriteit Persoonsgegevens', url: 'https://www.autoriteitpersoonsgegevens.nl/rss/nieuws' },
    { naam: 'Reclame Code Commissie', url: 'https://www.reclamecode.nl/rss/uitspraken' },
    { naam: 'EUR-Lex digitaal', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-internal-market.xml' },
  ],
  it: [
    { naam: 'Autoriteit Persoonsgegevens', url: 'https://www.autoriteitpersoonsgegevens.nl/rss/nieuws' },
    { naam: 'NCSC nieuws', url: 'https://www.ncsc.nl/rss/actueel' },
    { naam: 'ACM digitaal', url: 'https://www.acm.nl/rss/nieuws' },
    { naam: 'EUR-Lex digitaal', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-internal-market.xml' },
  ],
  esg: [
    { naam: 'Staatscourant', url: 'https://www.officielebekendmakingen.nl/rss/stcrt' },
    { naam: 'AFM duurzaamheid', url: 'https://www.afm.nl/rss/nieuws' },
    { naam: 'EUR-Lex milieu', url: 'https://eur-lex.europa.eu/RSSFEEDS/rss-legal-acts-environment.xml' },
    { naam: 'RVO nieuws', url: 'https://www.rvo.nl/rss/nieuws' },
  ],
  zorg: [
    { naam: 'NZa nieuws', url: 'https://puc.overheid.nl/nza/rss' },
    { naam: 'IGJ nieuws', url: 'https://www.igj.nl/rss/nieuws' },
    { naam: 'Rechtspraak gezondheidsrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Gezondheidsrecht' },
    { naam: 'Rijksoverheid VWS', url: 'https://www.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport/rss' },
  ],
}

// Domein whitelist — alleen officiële bronnen toegestaan
const TOEGESTANE_DOMEINEN = [
  '.nl', 'europa.eu', '.gov', 'eur-lex.europa.eu',
  'overheid.nl', 'rechtspraak.nl', 'belastingdienst.nl',
]

function isBetrouwbaarDomein(url: string): boolean {
  return TOEGESTANE_DOMEINEN.some(d => url.includes(d))
}

// Normaliseer vakgebied naar sleutel
function normaliseerVakgebied(vakgebied: string): string {
  const lower = vakgebied.toLowerCase()
  if (lower.includes('fiscal') || lower.includes('belasting') || lower.includes('vpb') || lower.includes('btw')) return 'fiscaal'
  if (lower.includes('financ') || lower.includes('boekhoud')) return 'finance'
  if (lower.includes('hr') || lower.includes('human') || lower.includes('arbeid') || lower.includes('personeel')) return 'hr'
  if (lower.includes('privacy') || lower.includes('avg') || lower.includes('gdpr') || lower.includes('data')) return 'privacy'
  if (lower.includes('marketing') || lower.includes('reclame') || lower.includes('communicatie')) return 'marketing'
  if (lower.includes('it') || lower.includes('cyber') || lower.includes('software') || lower.includes('tech')) return 'it'
  if (lower.includes('esg') || lower.includes('duurzaam') || lower.includes('milieu') || lower.includes('sustainab')) return 'esg'
  if (lower.includes('zorg') || lower.includes('medisch') || lower.includes('gezondheid')) return 'zorg'
  return 'onbekend'
}

// Haal bronnen op — vaste lijst of via Claude als onbekend vakgebied
export async function getBronnen(vakgebied: string): Promise<{ naam: string; url: string }[]> {
  const sleutel = normaliseerVakgebied(vakgebied)

  if (sleutel !== 'onbekend') {
    return VASTE_BRONNEN[sleutel] ?? []
  }

  // Onbekend vakgebied: vraag Claude om bronnen
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Vakgebied: "${vakgebied}"

Geef een JSON-array van maximaal 6 officiële Nederlandse of EU-bronnen (RSS-feeds of nieuwspagina-URLs) die relevante wet- en regelgeving publiceren voor dit vakgebied.

Regels:
- Alleen primaire overheidsbronnen of erkende toezichthouders
- Domeinen moeten eindigen op .nl, europa.eu of .gov
- Geen nieuwssites, blogs of commerciële partijen

Retourneer ALLEEN een JSON-array in dit formaat, zonder uitleg:
[{"naam": "...", "url": "..."}]`
      }]
    })
  })

  const data = await response.json()
  const tekst = data.content?.[0]?.text ?? '[]'

  try {
    const bronnen = JSON.parse(tekst)
    // Veiligheidscheck: alleen whitelisted domeinen
    return bronnen.filter((b: { naam: string; url: string }) => isBetrouwbaarDomein(b.url))
  } catch {
    return []
  }
}
