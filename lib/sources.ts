import { supabase } from '@/lib/supabase'

// Bronnenlijst — officiële RSS-feeds per land en vakgebied.
//
// Deze lijst is sinds augustus 2026 de FALLBACK. De werkelijke catalogus staat
// in de tabel `bronnen` in Supabase, zodat de watchdog een dode feed in
// quarantaine kan zetten en bronnen kunnen worden toegevoegd zonder deploy.
// Deze code-versie blijft bestaan als vangnet: is de tabel leeg of onbereikbaar,
// dan draait alles hier gewoon op door. Houd hem daarom actueel.
//
// BELANGRIJK: elke URL in dit bestand is gecontroleerd met `npm run check:bronnen`
// (scripts/check-bronnen.mjs). Voeg nooit een feed toe die je niet zelf hebt zien
// werken — een dode feed valt niet op, want fetchFeed logt de fout en gaat door,
// waardoor een abonnee stilletjes een lege of irrelevante nieuwsbrief krijgt.
//
// Bijgewerkt en geverifieerd: 1 augustus 2026.
// Veel Nederlandse overheidssites (Rijksoverheid, ACM, DNB, RVO, NZa) hebben hun
// RSS-feeds inmiddels offline gehaald. Waar geen werkende specialistische feed
// bestaat, vangt de basisset dat op.

type BronEntry = { naam: string; url: string }

// ─── BASISSET ────────────────────────────────────────────────────────────────
// Deze drie feeds gaan naar élke abonnee, ongeacht land of vakgebied. Ze zijn
// domeinbreed: Rechtspraak dekt alle rechtsgebieden, EUR-Lex L bevat alle nieuwe
// EU-wetgeving (van machinerichtlijn en CE-markering tot financieel toezicht).
// Hierdoor kan een abonnee nooit zonder bronnen komen te zitten, ook niet als
// zijn vakgebied geen eigen feed heeft.
const RECHTSPRAAK   = { naam: 'Rechtspraak.nl',                  url: 'https://uitspraken.rechtspraak.nl/rss' }
const EUR_LEX_L     = { naam: 'EUR-Lex — nieuwe EU-wetgeving',   url: 'https://eur-lex.europa.eu/EN/display-feed.rss?rssId=165' }
const EUR_LEX_C     = { naam: 'EUR-Lex — mededelingen',          url: 'https://eur-lex.europa.eu/EN/display-feed.rss?rssId=166' }

const BASIS: BronEntry[] = [RECHTSPRAAK, EUR_LEX_L, EUR_LEX_C]

// ─── NEDERLAND ───────────────────────────────────────────────────────────────
const AFM_PROF      = { naam: 'AFM (professionals)',             url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-professionals' }
const AFM_CONS      = { naam: 'AFM (consumenten)',               url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-consumenten' }
const AFM_WAARSCH   = { naam: 'AFM — waarschuwingen',            url: 'https://www.afm.nl/nl-nl/rss-feed/waarschuwingen-afm' }
// DNB publiceert zijn feed achter interne ID's; die URL is niet te raden en alleen
// te vinden via dnb.nl/rss-feeds/. Niet "opschonen" naar een mooiere vorm.
const DNB           = { naam: 'De Nederlandsche Bank',           url: 'https://www.dnb.nl/nl/rss/13039/4612' }
const AP            = { naam: 'Autoriteit Persoonsgegevens',     url: 'https://www.autoriteitpersoonsgegevens.nl/nl/actueel/rss.xml' }
const AWVN          = { naam: 'AWVN (arbeidsvoorwaarden)',       url: 'https://www.awvn.nl/feed/' }
const DTC           = { naam: 'Digital Trust Center',            url: 'https://www.digitaltrustcenter.nl/rss.xml' }
const NCSC_ADV      = { naam: 'NCSC — beveiligingsadviezen',     url: 'https://advisories.ncsc.nl/rss/advisories' }
const NCSC_NIEUWS   = { naam: 'NCSC — nieuws',                   url: 'https://feeds.ncsc.nl/nieuws.rss' }
// Zelfregulering, geen overheid — bewust toegelaten. De Reclame Code Commissie is
// in Nederland het gezaghebbende orgaan voor reclamerecht, en zonder deze bron
// heeft het vakgebied Marketing geen enkele inhoudelijke feed. Dit is de enige
// uitzondering op "alleen wetgevers, toezichthouders en rechtspraak".
const RECLAME_CODE  = { naam: 'Reclame Code Commissie',          url: 'https://www.reclamecode.nl/uitspraken/resultaten/feed' }

// ─── EUROPESE UNIE ───────────────────────────────────────────────────────────
const ESMA          = { naam: 'ESMA (financieel toezicht EU)',   url: 'https://www.esma.europa.eu/rss.xml' }
const EBA           = { naam: 'European Banking Authority',      url: 'https://www.eba.europa.eu/rss.xml' }
const EDPB          = { naam: 'European Data Protection Board',  url: 'https://www.edpb.europa.eu/feed/news_en' }
const EUOSHA        = { naam: 'EU-OSHA (arbeidsomstandigheden)', url: 'https://osha.europa.eu/nl/rss.xml' }
const EFSA          = { naam: 'EFSA (voedselveiligheid EU)',     url: 'https://www.efsa.europa.eu/en/all/rss' }

// ─── VERENIGD KONINKRIJK ─────────────────────────────────────────────────────
const UK_LEGISLATION     = { naam: 'Legislation.gov.uk',              url: 'https://www.legislation.gov.uk/new/data.feed' }
const UK_FCA             = { naam: 'FCA (UK financieel toezicht)',    url: 'https://www.fca.org.uk/news/rss.xml' }
const UK_HMRC            = { naam: 'HMRC (UK belasting)',             url: 'https://www.gov.uk/government/organisations/hm-revenue-customs.atom' }
const UK_CMA             = { naam: 'CMA (UK mededinging)',            url: 'https://www.gov.uk/government/organisations/competition-and-markets-authority.atom' }
const UK_PRA             = { naam: 'Bank of England / PRA',           url: 'https://www.bankofengland.co.uk/rss/publications' }
const UK_COMPANIES_HOUSE = { naam: 'Companies House (UK)',            url: 'https://www.gov.uk/government/organisations/companies-house.atom' }
const UK_ENV_AGENCY      = { naam: 'Environment Agency (UK)',         url: 'https://www.gov.uk/government/organisations/environment-agency.atom' }

// ─── VERENIGDE STATEN ────────────────────────────────────────────────────────
const SEC_US        = { naam: 'SEC (US financieel toezicht)',    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&dateb=&owner=include&count=20&output=atom' }
const FED_RESERVE   = { naam: 'Federal Reserve (US)',            url: 'https://www.federalreserve.gov/feeds/press_all.xml' }
const GOVINFO_US    = { naam: 'GovInfo (US wetgeving)',          url: 'https://www.govinfo.gov/rss/plaw.xml' }
const CISA_US       = { naam: 'CISA (US cybersecurity)',         url: 'https://www.cisa.gov/news.xml' }

// ─── OVERIGE LANDEN ──────────────────────────────────────────────────────────
const BE_OVERHEID   = { naam: 'Belgische overheid',              url: 'https://www.belgium.be/nl/rss.xml' }
const DE_DSK        = { naam: 'Datenschutzkonferenz (DE)',       url: 'https://www.datenschutzkonferenz-online.de/rss.xml' }
const IT_GOVERNO    = { naam: 'Governo Italiano',                url: 'https://www.governo.it/it/rss.xml' }

// ─── BRONNEN PER LAND × VAKGEBIED ────────────────────────────────────────────
// Elke categorie = specialistische feeds + de basisset. De basisset staat achteraan
// zodat de specialistische bronnen bovenaan de scout-resultaten komen.
const met = (...specialisten: BronEntry[]): BronEntry[] => [...specialisten, ...BASIS]

const BRONNEN_PER_LAND: Record<string, Record<string, BronEntry[]>> = {
  nl: {
    fiscaal:   met(DNB, AFM_PROF),
    finance:   met(AFM_PROF, AFM_CONS, DNB, AFM_WAARSCH),
    hr:        met(AWVN, EUOSHA),
    privacy:   met(AP, EDPB),
    // Geen AFM-waarschuwingen hier: die items hebben als titel alleen een
    // bedrijfsnaam ("Capitvo Inc."), waardoor de classificatie ze bij gebrek aan
    // context hoog scoorde voor marketing terwijl ze over vergunningen gaan.
    marketing: met(RECLAME_CODE, EDPB),
    it:        met(DTC, NCSC_NIEUWS, NCSC_ADV, AP),
    techniek:  met(NCSC_ADV, EUOSHA),
    esg:       met(EFSA, EUOSHA),
    zorg:      met(EFSA),
    algemeen:  met(),
  },
  eu: {
    fiscaal:   met(ESMA),
    finance:   met(ESMA, EBA),
    hr:        met(EUOSHA),
    privacy:   met(EDPB),
    marketing: met(EDPB),
    it:        met(EDPB, NCSC_ADV),
    techniek:  met(EUOSHA, NCSC_ADV),
    esg:       met(EFSA, EUOSHA),
    zorg:      met(EFSA),
    algemeen:  met(),
  },
  uk: {
    fiscaal:   met(UK_HMRC, UK_LEGISLATION),
    finance:   met(UK_FCA, UK_PRA, UK_LEGISLATION),
    hr:        met(UK_LEGISLATION, EUOSHA),
    privacy:   met(UK_LEGISLATION, EDPB),
    marketing: met(UK_CMA, UK_LEGISLATION),
    it:        met(UK_LEGISLATION, NCSC_ADV),
    techniek:  met(UK_LEGISLATION, UK_ENV_AGENCY),
    esg:       met(UK_ENV_AGENCY, UK_LEGISLATION),
    zorg:      met(UK_LEGISLATION),
    algemeen:  met(UK_LEGISLATION, UK_COMPANIES_HOUSE),
  },
  us: {
    fiscaal:   met(GOVINFO_US, FED_RESERVE),
    finance:   met(SEC_US, FED_RESERVE, GOVINFO_US),
    hr:        met(GOVINFO_US),
    privacy:   met(CISA_US, GOVINFO_US),
    marketing: met(GOVINFO_US),
    it:        met(CISA_US, GOVINFO_US),
    techniek:  met(CISA_US, GOVINFO_US),
    esg:       met(GOVINFO_US),
    zorg:      met(GOVINFO_US),
    algemeen:  met(GOVINFO_US),
  },
  be: {
    fiscaal:   met(BE_OVERHEID),
    finance:   met(BE_OVERHEID, ESMA, EBA),
    hr:        met(BE_OVERHEID, EUOSHA),
    privacy:   met(BE_OVERHEID, EDPB),
    marketing: met(BE_OVERHEID),
    it:        met(BE_OVERHEID, EDPB),
    techniek:  met(BE_OVERHEID, EUOSHA),
    esg:       met(BE_OVERHEID, EFSA),
    zorg:      met(BE_OVERHEID, EFSA),
    algemeen:  met(BE_OVERHEID),
  },
  de: {
    fiscaal:   met(),
    finance:   met(ESMA, EBA),
    hr:        met(EUOSHA),
    privacy:   met(DE_DSK, EDPB),
    marketing: met(DE_DSK),
    it:        met(DE_DSK, NCSC_ADV),
    techniek:  met(EUOSHA, NCSC_ADV),
    esg:       met(EFSA, EUOSHA),
    zorg:      met(EFSA),
    algemeen:  met(DE_DSK),
  },
  it_land: {
    fiscaal:   met(IT_GOVERNO),
    finance:   met(IT_GOVERNO, ESMA, EBA),
    hr:        met(IT_GOVERNO, EUOSHA),
    privacy:   met(IT_GOVERNO, EDPB),
    marketing: met(IT_GOVERNO),
    it:        met(IT_GOVERNO, EDPB),
    techniek:  met(IT_GOVERNO, EUOSHA),
    esg:       met(IT_GOVERNO, EFSA),
    zorg:      met(IT_GOVERNO, EFSA),
    algemeen:  met(IT_GOVERNO),
  },
  internationaal: {
    fiscaal:   met(GOVINFO_US, UK_HMRC),
    finance:   met(ESMA, EBA, SEC_US, UK_FCA),
    hr:        met(EUOSHA),
    privacy:   met(EDPB, CISA_US),
    marketing: met(UK_CMA),
    it:        met(CISA_US, NCSC_ADV, EDPB),
    techniek:  met(EUOSHA, CISA_US),
    esg:       met(EFSA, UK_ENV_AGENCY),
    zorg:      met(EFSA),
    algemeen:  met(UK_LEGISLATION, GOVINFO_US),
  },
}

// ─── LAND_NAMEN voor UI ───────────────────────────────────────────────────────
export const LAND_NAMEN: Record<string, string> = {
  NL: 'Nederland', BE: 'België', DE: 'Duitsland', FR: 'Frankrijk',
  GB: 'Verenigd Koninkrijk', LU: 'Luxemburg', AT: 'Oostenrijk',
  CH: 'Zwitserland', ES: 'Spanje', IT: 'Italië', PL: 'Polen',
  DK: 'Denemarken', SE: 'Zweden', FI: 'Finland', IE: 'Ierland',
  US: 'Verenigde Staten',
}

// ─── VERTROUWDE DOMEINEN ─────────────────────────────────────────────────────
// Uitsluitend domeinen van wetgevers, toezichthouders en rechtspraak. Geen
// nieuwsmedia, geen brancheblogs, geen advieskantoren: die duiden regelgeving,
// en die duiding is precies wat Brieft zelf hoort te doen.
// Let op: dit zijn registreerbare domeinen. Subdomeinen matchen automatisch,
// losse landcodes als '.nl' horen hier NIET thuis — die kan iedereen kopen.
const TOEGESTANE_DOMEINEN = [
  // Nederland
  // reclamecode.nl is zelfregulering, geen overheid. Bewust toegelaten door Marij
  // op 1 augustus 2026: zonder deze bron is het vakgebied Marketing niet te
  // bedienen. Voeg hier niets aan toe zonder dezelfde afweging expliciet te maken.
  'reclamecode.nl',
  'overheid.nl', 'rechtspraak.nl', 'afm.nl', 'dnb.nl', 'acm.nl',
  'autoriteitpersoonsgegevens.nl', 'ncsc.nl', 'digitaltrustcenter.nl',
  'belastingdienst.nl', 'rvo.nl', 'nza.nl', 'uwv.nl', 'kvk.nl', 'awvn.nl',
  // Europese Unie
  'europa.eu',
  // Verenigde Staten (naast het .gov-suffix)
  'federalreserve.gov',
  // Verenigd Koninkrijk
  'parliament.uk', 'ico.org.uk', 'fca.org.uk', 'bankofengland.co.uk',
  // Duitsland
  'bundesregierung.de', 'bafin.de', 'bundesarbeitsgericht.de', 'bundestag.de',
  'datenschutzkonferenz-online.de', 'bundesfinanzhof.de',
  // Frankrijk
  'amf-france.org', 'cnil.fr', 'conseil-etat.fr',
  // België
  'belgium.be', 'fsma.be', 'gegevensbeschermingsautoriteit.be', 'nbb.be',
  // Spanje / Italië
  'boe.es', 'cnmv.es', 'aepd.es',
  'gazzettaufficiale.it', 'governo.it', 'consob.it', 'garanteprivacy.it',
  // Internationale organisaties
  'oecd.org', 'ilo.org', 'fatf-gafi.org', 'wto.org', 'bis.org',
]

// Toetst de HOSTNAME, niet de hele URL. Een kale url.includes('.nl') liet elke
// Nederlandse site door — nu.nl, de Telegraaf, een willekeurige blog — en
// url.includes('.gov') liet zelfs phishing.gov.malware.ru toe. Alleen suffixen
// die een overheid zelf uitgeeft mogen als geheel domein gelden.
const OFFICIELE_SUFFIXEN = ['.gov', '.gov.uk', '.overheid.nl', '.europa.eu', '.gouv.fr', '.bund.de', '.fgov.be']

function isBetrouwbaarDomein(url: string): boolean {
  let host: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false // officiële bronnen doen https
    host = u.hostname.toLowerCase()
  } catch {
    return false
  }

  if (OFFICIELE_SUFFIXEN.some(s => host.endsWith(s))) return true

  // Exacte match op het domein zelf of op een subdomein daarvan.
  return TOEGESTANE_DOMEINEN.some(d => host === d || host.endsWith(`.${d}`))
}

// Korte termen ('it', 'hr', 'esg') moeten als heel woord matchen. Met een kale
// includes() belandde "Kwaliteitsmanagement" en "Facilitair" in de IT-categorie,
// puur omdat daar de letters "it" in staan.
function bevatTerm(tekst: string, termen: string[]): boolean {
  return termen.some(t =>
    t.length <= 4
      ? new RegExp(`(^|[^a-z])${t}([^a-z]|$)`, 'i').test(tekst)
      : tekst.includes(t)
  )
}

const CATEGORIE_TERMEN: [string, string[]][] = [
  // 'fisca', niet 'fiscal': het Nederlandse "fiscaal" bevat die string niet
  // (fisca-a-l). Hierdoor viel iedereen die Fiscaal koos terug op 'algemeen'.
  ['fiscaal',   ['fisca', 'belasting', 'vpb', 'btw', 'tax']],
  ['finance',   ['financ', 'boekhoud', 'accoun', 'controller', 'cfo', 'treasury', 'audit', 'inkoop', 'aanbesteding', 'procurement', 'supply']],
  ['hr',        ['hr', 'human resource', 'arbeid', 'personeel', 'cao', 'recrut', 'talent', 'verzuim']],
  ['privacy',   ['privacy', 'avg', 'gdpr', 'data protec', 'persoonsgegevens', 'dpo', 'compliance', 'legal', 'juridisch', 'jurist', 'advocaat', 'recht', 'counsel']],
  ['marketing', ['marketing', 'reclame', 'communicat', 'consument', 'brand', 'campagne']],
  // Techniek vóór IT: "elektrotechniek" en "software engineering" horen elk in hun
  // eigen categorie, en 'tech' zou anders alles naar IT trekken.
  ['techniek',  ['elektro', 'elektronica', 'engineering', 'techniek', 'technisch', 'werktuigbouw', 'machine', 'installatie', 'bouwkunde', 'productie', 'maakindustrie']],
  ['it',        ['it', 'ict', 'cyber', 'software', 'tech', 'digital', 'security', 'ciso', 'cto', 'data']],
  ['esg',       ['esg', 'duurzaam', 'milieu', 'sustainab', 'klimaat', 'csrd']],
  ['zorg',      ['zorg', 'medisch', 'gezondheid', 'pharma', 'care', 'health', 'farma']],
]

// Haalt de bronnen voor één land × categorie uit de database, plus de basisset.
// Geeft null terug wanneer de tabel niet bestaat, onbereikbaar is of niets
// oplevert — dan valt getBronnen terug op de catalogus in dit bestand. Dat
// onderscheid is bewust: een lege tabel mag nooit een lege nieuwsbrief opleveren.
async function bronnenUitDatabase(land: string, categorie: string): Promise<BronEntry[] | null> {
  try {
    const [specialisten, basis] = await Promise.all([
      supabase.from('bronnen').select('naam, url')
        .eq('status', 'actief').eq('is_basis', false)
        .eq('land', land).eq('categorie', categorie),
      supabase.from('bronnen').select('naam, url')
        .eq('status', 'actief').eq('is_basis', true),
    ])

    if (specialisten.error || basis.error) {
      console.error('[bronnen] databaselezing mislukt, terugval op de code-catalogus:',
        specialisten.error?.message ?? basis.error?.message)
      return null
    }

    const gecombineerd = dedupliceer([...(specialisten.data ?? []), ...(basis.data ?? [])])
    return gecombineerd.length > 0 ? gecombineerd : null
  } catch (err) {
    console.error('[bronnen] databaselezing wierp een fout, terugval op de code-catalogus:', err)
    return null
  }
}

// Controleert of een feed-URL echt bestaat en items bevat. Bewust kort van
// timeout: dit draait tijdens een verzendrun en mag die niet ophouden.
async function feedLevertArtikelen(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return false
    const xml = await res.text()
    return /<item[ >]|<entry[ >]/.test(xml)
  } catch {
    return false
  }
}

function normaliseerVakgebied(vakgebied: string): string {
  const lower = vakgebied.toLowerCase()
  for (const [categorie, termen] of CATEGORIE_TERMEN) {
    if (bevatTerm(lower, termen)) return categorie
  }
  return 'algemeen'
}

function normaliseerLand(land?: string): string {
  if (!land) return 'nl'
  const lower = land.toLowerCase()
  if (lower === 'nl' || lower.includes('nederland')) return 'nl'
  if (lower === 'be' || lower.includes('belgi')) return 'be'
  if (lower === 'de' || lower.includes('duitsl') || lower.includes('german')) return 'de'
  if (lower === 'fr' || lower.includes('frankr') || lower.includes('france')) return 'fr'
  if (lower === 'gb' || lower === 'uk' || lower.includes('united kingdom') || lower.includes('britain') || lower.includes('england')) return 'uk'
  if (lower === 'us' || lower.includes('united states') || lower.includes('america')) return 'us'
  if (lower === 'es' || lower.includes('spanj') || lower.includes('spain')) return 'es'
  if (lower === 'it' || lower.includes('itali')) return 'it_land'
  if (lower === 'eu' || lower.includes('europa') || lower.includes('europe')) return 'eu'
  if (lower.includes('internationaal') || lower.includes('international') || lower.includes('global')) return 'internationaal'
  // Overige EU-landen (LU, AT, CH, PL, DK, SE, FI, IE) → EU-bronnen
  const euLanden = ['lu', 'at', 'ch', 'pl', 'dk', 'se', 'fi', 'ie']
  if (euLanden.includes(lower)) return 'eu'
  return 'nl'
}

function dedupliceer(bronnen: BronEntry[]): BronEntry[] {
  const seen = new Set<string>()
  return bronnen.filter(b => {
    if (seen.has(b.url)) return false
    seen.add(b.url)
    return true
  })
}

export async function getBronnen(
  vakgebied: string,
  opties?: { branche?: string; extraOnderwerpen?: string; land?: string }
): Promise<BronEntry[]> {
  const landSleutel = normaliseerLand(opties?.land)
  // Levert het vakgebied geen categorie op, dan is de branche de beste tweede
  // aanwijzing. Zonder dit kreeg iemand met vakgebied "Engineering, elektronica"
  // en branche "ICT & Tech" de algemene bronnen in plaats van iets passends.
  const vakUitVakgebied = normaliseerVakgebied(vakgebied)
  const vakSleutel = vakUitVakgebied !== 'algemeen'
    ? vakUitVakgebied
    : normaliseerVakgebied(opties?.branche ?? '')
  const extraOnderwerpen = opties?.extraOnderwerpen?.trim() ?? ''
  const branche = opties?.branche?.trim() ?? ''

  // Eerst de database; die is leidend zodra hij gevuld is, zodat een agent of
  // handmatige correctie meteen effect heeft zonder deploy. Is de tabel er nog
  // niet, leeg, of onbereikbaar, dan valt alles terug op de catalogus hieronder.
  const uitDatabase = await bronnenUitDatabase(landSleutel, vakSleutel)

  let basisBronnen: BronEntry[]
  if (uitDatabase) {
    basisBronnen = uitDatabase
  } else {
    const nationaleBronnen = BRONNEN_PER_LAND[landSleutel]?.[vakSleutel]
      ?? BRONNEN_PER_LAND[landSleutel]?.['algemeen']
      ?? BRONNEN_PER_LAND['nl']['algemeen']

    // Automatisch 2 EU-bronnen toevoegen voor niet-EU/internationaal landen
    const voegEuToe = !['eu', 'internationaal'].includes(landSleutel)
    const euAanvulling = voegEuToe
      ? (BRONNEN_PER_LAND['eu'][vakSleutel] ?? BRONNEN_PER_LAND['eu']['algemeen']).slice(0, 2)
      : []

    basisBronnen = dedupliceer([...nationaleBronnen, ...euAanvulling])
  }

  // Supplementaire bronnen via Claude op basis van extra interesses
  if (extraOnderwerpen) {
    try {
      const landNaam = LAND_NAMEN[opties?.land ?? 'NL'] ?? opties?.land ?? 'Nederland'
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Land: ${landNaam}
Vakgebied: "${vakgebied}"
Extra interesses: "${extraOnderwerpen}"
${branche ? `Branche: ${branche}` : ''}

Bestaande bronnen: ${basisBronnen.map(b => b.naam).join(', ')}.

Geef een JSON-array van maximaal 2 aanvullende officiële RSS-feeds specifiek voor de extra interesses die NIET al in de bestaande bronnen zitten.
Gebruik ALLEEN feeds waarvan je de exacte werkende URL zeker weet. Geef liever een lege array dan foute URLs.

Retourneer ALLEEN een JSON-array (mag leeg zijn):
[{"naam": "...", "url": "..."}]`,
          }],
        }),
      })
      const data = await response.json()
      const tekst = data.content?.[0]?.text ?? '[]'
      const extra: BronEntry[] = JSON.parse(tekst.replace(/```json|```/g, '').trim())
      // Een betrouwbaar domein zegt niets over of de feed bestaat. Modellen
      // verzinnen plausibele maar dode URL's, en die belandden hiervoor
      // ongemerkt in het profiel van een abonnee. Dus: eerst ophalen, en alleen
      // bewaren wat daadwerkelijk artikelen oplevert.
      const kandidaten = extra.filter(b => b.naam && b.url && isBetrouwbaarDomein(b.url))
      const gecontroleerd = await Promise.all(
        kandidaten.map(async b => (await feedLevertArtikelen(b.url)) ? b : null)
      )
      const gefilterd = gecontroleerd.filter((b): b is BronEntry => b !== null)
      return dedupliceer([...basisBronnen, ...gefilterd])
    } catch {
      // Aanvulling mislukt: ga door met basisBronnen
    }
  }

  return basisBronnen
}
