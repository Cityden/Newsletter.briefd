// Bronnenlijst — alleen URLs getest en bevestigd werkend (april 2026)
// Ministerie-feeds: feeds.rijksoverheid.nl/ministeries/*/nieuws.rss — allemaal 200, 20 items
// AFM: /nl-nl/rss-feed/nieuws-professionals en nieuws-consumenten — 50 items elk
// Digital Trust Center: /rss.xml — 151 items
// RVO: /rss.xml — 40 items
// Autoriteit Persoonsgegevens: /nl/actueel/rss.xml — 20 items
// Inkomstenbelasting: feeds.rijksoverheid.nl/onderwerpen/inkomstenbelasting/nieuws.rss — 10 items

const RIJKSOVERHEID    = { naam: 'Rijksoverheid',                    url: 'https://feeds.rijksoverheid.nl/nieuws.rss' }
const MIN_FINANCIEN    = { naam: 'Ministerie van Financiën',          url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-financien/nieuws.rss' }
const MIN_SZW          = { naam: 'Ministerie van Sociale Zaken',      url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-sociale-zaken-en-werkgelegenheid/nieuws.rss' }
const MIN_VWS          = { naam: 'Ministerie van VWS',                url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport/nieuws.rss' }
const MIN_JV           = { naam: 'Ministerie van Justitie en Veiligheid', url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-justitie-en-veiligheid/nieuws.rss' }
const MIN_BZK          = { naam: 'Ministerie van BZK',                url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties/nieuws.rss' }
const MIN_IW           = { naam: 'Ministerie van IenW',               url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-infrastructuur-en-waterstaat/nieuws.rss' }
const MIN_EZK          = { naam: 'Ministerie van EZK',                url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-economische-zaken-en-klimaat/nieuws.rss' }
const AFM_PROF         = { naam: 'AFM (professionals)',               url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-professionals' }
const AFM_CONS         = { naam: 'AFM (consumenten)',                 url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-consumenten' }
const DTC              = { naam: 'Digital Trust Center',              url: 'https://www.digitaltrustcenter.nl/rss.xml' }
const RVO              = { naam: 'RVO',                               url: 'https://www.rvo.nl/rss.xml' }
const AP               = { naam: 'Autoriteit Persoonsgegevens',       url: 'https://www.autoriteitpersoonsgegevens.nl/nl/actueel/rss.xml' }
const INKOMSTENBELAST  = { naam: 'Rijksoverheid – Inkomstenbelasting', url: 'https://feeds.rijksoverheid.nl/onderwerpen/inkomstenbelasting/nieuws.rss' }
const RECHTSPRAAK      = { naam: 'Rechtspraak.nl',                    url: 'https://uitspraken.rechtspraak.nl/rss' }

const VASTE_BRONNEN: Record<string, { naam: string; url: string }[]> = {
  fiscaal:   [INKOMSTENBELAST, MIN_FINANCIEN, RECHTSPRAAK, RIJKSOVERHEID],
  finance:   [AFM_PROF, AFM_CONS, MIN_FINANCIEN, RECHTSPRAAK, RIJKSOVERHEID],
  hr:        [MIN_SZW, RECHTSPRAAK, RIJKSOVERHEID],
  privacy:   [AP, MIN_JV, MIN_BZK, RECHTSPRAAK, RIJKSOVERHEID],
  marketing: [MIN_EZK, RECHTSPRAAK, RIJKSOVERHEID],
  it:        [DTC, RECHTSPRAAK, RIJKSOVERHEID],
  esg:       [RVO, MIN_IW, MIN_EZK, RECHTSPRAAK, RIJKSOVERHEID],
  zorg:      [MIN_VWS, RECHTSPRAAK, RIJKSOVERHEID],
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
  if (lower.includes('fiscal') || lower.includes('belasting') || lower.includes('vpb') || lower.includes('btw') || lower.includes('inkomstenbelasting')) return 'fiscaal'
  if (lower.includes('financ') || lower.includes('boekhoud') || lower.includes('accoun') || lower.includes('afm') || lower.includes('kapitaal')) return 'finance'
  if (lower.includes('hr') || lower.includes('human') || lower.includes('arbeid') || lower.includes('personeel') || lower.includes('loondienst') || lower.includes('cao')) return 'hr'
  if (lower.includes('privacy') || lower.includes('avg') || lower.includes('gdpr') || lower.includes('data') || lower.includes('persoonsgegevens')) return 'privacy'
  if (lower.includes('marketing') || lower.includes('reclame') || lower.includes('communicatie') || lower.includes('consument')) return 'marketing'
  if (lower.includes('it') || lower.includes('cyber') || lower.includes('software') || lower.includes('tech') || lower.includes('digital') || lower.includes('ict')) return 'it'
  if (lower.includes('esg') || lower.includes('duurzaam') || lower.includes('milieu') || lower.includes('sustainab') || lower.includes('klimaat') || lower.includes('co2')) return 'esg'
  if (lower.includes('zorg') || lower.includes('medisch') || lower.includes('gezondheid') || lower.includes('pharma') || lower.includes('vws')) return 'zorg'
  if (lower.includes('inkoop') || lower.includes('aanbesteding') || lower.includes('procurement')) return 'finance'
  return 'onbekend'
}

export async function getBronnen(vakgebied: string): Promise<{ naam: string; url: string }[]> {
  const sleutel = normaliseerVakgebied(vakgebied)

  if (sleutel !== 'onbekend') {
    return VASTE_BRONNEN[sleutel] ?? [RIJKSOVERHEID]
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
        model: 'claude-haiku-4-5-20251001',
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

    const heeftRijksoverheid = gefilterd.some((b: { url: string }) => b.url.includes('rijksoverheid'))
    if (!heeftRijksoverheid) {
      gefilterd.unshift(RIJKSOVERHEID)
    }
    return gefilterd
  } catch {
    return [RIJKSOVERHEID]
  }
}
