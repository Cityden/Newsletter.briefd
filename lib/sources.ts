// Vaste bronnenlijst — alleen URLs die aantoonbaar werken (getest april 2026)
// Hoofdfeed: feeds.rijksoverheid.nl/nieuws.rss (breed, altijd actueel)
// Rechtspraak: uitspraken.rechtspraak.nl/rss?rechtsgebied=... (Atom-formaat)

const VASTE_BRONNEN: Record<string, { naam: string; url: string }[]> = {
  fiscaal: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Belastingrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Belastingrecht' },
  ],
  finance: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Civielrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
    { naam: 'Rechtspraak Belastingrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Belastingrecht' },
  ],
  hr: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Arbeidsrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Arbeidsrecht' },
  ],
  privacy: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Civielrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
  ],
  marketing: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Civielrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
  ],
  it: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Civielrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
  ],
  esg: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Civielrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Civielrecht' },
  ],
  zorg: [
    { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    { naam: 'Rechtspraak Gezondheidsrecht', url: 'https://uitspraken.rechtspraak.nl/rss?rechtsgebied=Gezondheidsrecht' },
  ],
}

const TOEGESTANE_DOMEINEN = [
  '.nl', 'europa.eu', '.gov', 'eur-lex.europa.eu',
  'overheid.nl', 'rechtspraak.nl', 'belastingdienst.nl',
]

function isBetrouwbaarDomein(url: string): boolean {
  return TOEGESTANE_DOMEINEN.some(d => url.includes(d))
}

function normaliseerVakgebied(vakgebied: string): string {
  const lower = vakgebied.toLowerCase()
  if (lower.includes('fiscal') || lower.includes('belasting') || lower.includes('vpb') || lower.includes('btw')) return 'fiscaal'
  if (lower.includes('financ') || lower.includes('boekhoud') || lower.includes('accoun')) return 'finance'
  if (lower.includes('hr') || lower.includes('human') || lower.includes('arbeid') || lower.includes('personeel')) return 'hr'
  if (lower.includes('privacy') || lower.includes('avg') || lower.includes('gdpr') || lower.includes('data')) return 'privacy'
  if (lower.includes('marketing') || lower.includes('reclame') || lower.includes('communicatie')) return 'marketing'
  if (lower.includes('it') || lower.includes('cyber') || lower.includes('software') || lower.includes('tech') || lower.includes('digital')) return 'it'
  if (lower.includes('esg') || lower.includes('duurzaam') || lower.includes('milieu') || lower.includes('sustainab')) return 'esg'
  if (lower.includes('zorg') || lower.includes('medisch') || lower.includes('gezondheid') || lower.includes('pharma')) return 'zorg'
  if (lower.includes('inkoop') || lower.includes('aanbesteding') || lower.includes('procurement')) return 'finance'
  return 'onbekend'
}

export async function getBronnen(vakgebied: string): Promise<{ naam: string; url: string }[]> {
  const sleutel = normaliseerVakgebied(vakgebied)

  if (sleutel !== 'onbekend') {
    return VASTE_BRONNEN[sleutel] ?? [
      { naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' },
    ]
  }

  // Onbekend vakgebied: vraag Claude om bronnen, altijd rijksoverheid als fallback
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Vakgebied: "${vakgebied}"

Geef een JSON-array van maximaal 4 officiële Nederlandse of EU RSS-feeds die relevante wet- en regelgeving publiceren voor dit vakgebied.

Regels:
- Alleen primaire overheidsbronnen of erkende toezichthouders
- Domeinen moeten eindigen op .nl, europa.eu of .gov
- Voeg altijd https://feeds.rijksoverheid.nl/nieuws.rss toe als eerste bron
- Geen nieuwssites, blogs of commerciële partijen

Retourneer ALLEEN een JSON-array, zonder uitleg:
[{"naam": "...", "url": "..."}]`
        }]
      })
    })

    const data = await response.json()
    const tekst = data.content?.[0]?.text ?? '[]'
    const clean = tekst.replace(/```json|```/g, '').trim()
    const bronnen = JSON.parse(clean)
    const gefilterd = bronnen.filter((b: { naam: string; url: string }) => isBetrouwbaarDomein(b.url))

    // Zorg altijd voor rijksoverheid als fallback
    const heeftRijksoverheid = gefilterd.some((b: { url: string }) => b.url.includes('rijksoverheid'))
    if (!heeftRijksoverheid) {
      gefilterd.unshift({ naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' })
    }
    return gefilterd
  } catch {
    return [{ naam: 'Rijksoverheid', url: 'https://feeds.rijksoverheid.nl/nieuws.rss' }]
  }
}
