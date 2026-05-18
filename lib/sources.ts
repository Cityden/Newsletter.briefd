// Bronnenlijst — Nederlandse, Europese en internationale officiële RSS-feeds
// Bijgewerkt mei 2026

// ─── NEDERLAND ───────────────────────────────────────────────────────────────
const RIJKSOVERHEID      = { naam: 'Rijksoverheid',                         url: 'https://feeds.rijksoverheid.nl/nieuws.rss' }
const MIN_FINANCIEN      = { naam: 'Ministerie van Financiën',              url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-financien/nieuws.rss' }
const MIN_SZW            = { naam: 'Ministerie van Sociale Zaken',          url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-sociale-zaken-en-werkgelegenheid/nieuws.rss' }
const MIN_VWS            = { naam: 'Ministerie van VWS',                    url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport/nieuws.rss' }
const MIN_JV             = { naam: 'Ministerie van Justitie en Veiligheid', url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-justitie-en-veiligheid/nieuws.rss' }
const MIN_BZK            = { naam: 'Ministerie van BZK',                    url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties/nieuws.rss' }
const MIN_IW             = { naam: 'Ministerie van IenW',                   url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-infrastructuur-en-waterstaat/nieuws.rss' }
const MIN_EZK            = { naam: 'Ministerie van EZK',                    url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-economische-zaken-en-klimaat/nieuws.rss' }
const AFM_PROF           = { naam: 'AFM (professionals)',                   url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-professionals' }
const AFM_CONS           = { naam: 'AFM (consumenten)',                     url: 'https://www.afm.nl/nl-nl/rss-feed/nieuws-consumenten' }
const DTC                = { naam: 'Digital Trust Center',                  url: 'https://www.digitaltrustcenter.nl/rss.xml' }
const RVO                = { naam: 'RVO',                                    url: 'https://www.rvo.nl/rss.xml' }
const AP                 = { naam: 'Autoriteit Persoonsgegevens',           url: 'https://www.autoriteitpersoonsgegevens.nl/nl/actueel/rss.xml' }
const INKOMSTENBELAST    = { naam: 'Rijksoverheid – Inkomstenbelasting',    url: 'https://feeds.rijksoverheid.nl/onderwerpen/inkomstenbelasting/nieuws.rss' }
const RECHTSPRAAK        = { naam: 'Rechtspraak.nl',                        url: 'https://uitspraken.rechtspraak.nl/rss' }
const AWVN               = { naam: 'AWVN',                                  url: 'https://www.awvn.nl/feed/' }
const DNB                = { naam: 'De Nederlandsche Bank',                 url: 'https://www.dnb.nl/rss/nieuws.xml' }
const ACM                = { naam: 'Autoriteit Consument & Markt',          url: 'https://www.acm.nl/nl/rss' }
const NZA                = { naam: 'Nederlandse Zorgautoriteit',            url: 'https://www.nza.nl/rss' }
const NCSC               = { naam: 'NCSC (Nationaal Cyber Security Centrum)',url: 'https://www.ncsc.nl/rss' }

// ─── EUROPESE UNIE ───────────────────────────────────────────────────────────
const EUR_LEX            = { naam: 'EUR-Lex (nieuwe wetgeving)',            url: 'https://eur-lex.europa.eu/rss/OJL.rss' }
const EUR_LEX_ALLE       = { naam: 'EUR-Lex (alle publicaties)',            url: 'https://eur-lex.europa.eu/rss/OJ.rss' }
const EDPB               = { naam: 'European Data Protection Board',        url: 'https://edpb.europa.eu/news/news_rss_en' }
const ESMA               = { naam: 'ESMA (financieel toezicht EU)',          url: 'https://www.esma.europa.eu/rss.xml' }
const EBA                = { naam: 'European Banking Authority',            url: 'https://www.eba.europa.eu/rss.xml' }
const EU_COMMISSION      = { naam: 'Europese Commissie',                    url: 'https://ec.europa.eu/commission/presscorner/home/rss' }
const ENISA              = { naam: 'ENISA (EU cybersecurity)',              url: 'https://www.enisa.europa.eu/news/enisa-news/RSS' }
const EIOPA              = { naam: 'EIOPA (EU verzekeringen/pensioenen)',    url: 'https://www.eiopa.europa.eu/rss.xml' }
const ECB                = { naam: 'Europese Centrale Bank',                url: 'https://www.ecb.europa.eu/rss/pr.html' }
const EU_PARLIAMENT      = { naam: 'Europees Parlement',                    url: 'https://www.europarl.europa.eu/rss/doc/top-stories/en.rss' }
const EUOSHA             = { naam: 'EU-OSHA (arbeidsomstandigheden EU)',     url: 'https://osha.europa.eu/en/rss.xml' }
const EEA                = { naam: 'European Environment Agency',           url: 'https://www.eea.europa.eu/rss' }

// ─── VERENIGDE STATEN ────────────────────────────────────────────────────────
const FED_REGISTER       = { naam: 'Federal Register (US)',                 url: 'https://www.federalregister.gov/documents/feed/index.rss' }
const FED_REGISTER_SIG   = { naam: 'Federal Register – Significant Rules',  url: 'https://www.federalregister.gov/documents/search/feed/index.rss?conditions%5Bsignificant%5D=1' }
const SEC_US             = { naam: 'SEC (US financieel toezicht)',          url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&dateb=&owner=include&count=20&output=atom' }
const FTC_US             = { naam: 'FTC (US consumentenbescherming)',       url: 'https://www.ftc.gov/feeds/press-release-rss.xml' }
const DOL_US             = { naam: 'Dept. of Labor (US arbeidsrecht)',      url: 'https://blog.dol.gov/feed' }
const HHS_US             = { naam: 'Dept. of Health & Human Services',     url: 'https://www.hhs.gov/rss/news.xml' }
const GOVINFO_US         = { naam: 'GovInfo (US wetgeving)',                url: 'https://www.govinfo.gov/rss/plaw.xml' }
const EEOC_US            = { naam: 'EEOC (US gelijke kansen arbeidsrecht)', url: 'https://www.eeoc.gov/newsroom/rss' }
const EPA_US             = { naam: 'EPA (US milieu)',                       url: 'https://www.epa.gov/rss/epa-news.xml' }
const CISA_US            = { naam: 'CISA (US cybersecurity)',               url: 'https://www.cisa.gov/news.xml' }
const NLRB_US            = { naam: 'NLRB (US vakbonden/arbeidsrecht)',      url: 'https://www.nlrb.gov/rss.xml' }
const IRS_US             = { naam: 'IRS (US belasting)',                    url: 'https://www.irs.gov/newsroom/feed' }
const DOJ_US             = { naam: 'Dept. of Justice (US)',                 url: 'https://www.justice.gov/feed/rss/opa-news' }
const FED_RESERVE        = { naam: 'Federal Reserve (US)',                  url: 'https://www.federalreserve.gov/feeds/press_all.xml' }

// ─── VERENIGD KONINKRIJK ─────────────────────────────────────────────────────
const UK_LEGISLATION     = { naam: 'Legislation.gov.uk (UK)',               url: 'https://www.legislation.gov.uk/new/data.feed' }
const UK_PARLIAMENT      = { naam: 'UK Parliament – Bills',                 url: 'https://bills.parliament.uk/rss/publicbills.rss' }
const UK_GOV_ALL         = { naam: 'GOV.UK – alle aankondigingen',          url: 'https://www.gov.uk/government/announcements.atom' }
const UK_ICO             = { naam: 'UK ICO (privacytoezicht)',              url: 'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/' }
const UK_FCA             = { naam: 'FCA (UK financieel toezicht)',          url: 'https://www.fca.org.uk/news/rss.xml' }
const UK_HMRC            = { naam: 'HMRC (UK belasting)',                   url: 'https://www.gov.uk/government/organisations/hm-revenue-customs.atom' }
const UK_HSE             = { naam: 'HSE (UK arbeidsomstandigheden)',        url: 'https://www.hse.gov.uk/news/rss.xml' }
const UK_CMA             = { naam: 'CMA (UK mededinging)',                  url: 'https://www.gov.uk/government/organisations/competition-and-markets-authority.atom' }
const UK_PRA             = { naam: 'PRA (UK banktoezicht)',                 url: 'https://www.bankofengland.co.uk/rss/publications' }
const UK_COMPANIES_HOUSE = { naam: 'Companies House (UK)',                  url: 'https://www.gov.uk/government/organisations/companies-house.atom' }
const UK_ENV_AGENCY      = { naam: 'Environment Agency (UK)',               url: 'https://www.gov.uk/government/organisations/environment-agency.atom' }
const UK_NCSC            = { naam: 'NCSC (UK cybersecurity)',               url: 'https://www.ncsc.gov.uk/feeds/news.xml' }

// ─── DUITSLAND ───────────────────────────────────────────────────────────────
const DE_BUNDESREGIERUNG      = { naam: 'Bundesregierung (Duitsland)',      url: 'https://www.bundesregierung.de/breg-de/aktuelles/rss.rss' }
const DE_BUNDESGESETZBLATT    = { naam: 'Bundesgesetzblatt (DE wetgeving)', url: 'https://www.recht.bund.de/api/rss/bgbl' }
const DE_BSI                  = { naam: 'BSI (DE cybersecurity)',           url: 'https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed.xml' }
const DE_BAFIN                = { naam: 'BaFin (DE financieel toezicht)',   url: 'https://www.bafin.de/SiteGlobals/Functions/RSS/EN/RSS_Aktuell_en.xml' }
const DE_BUNDESARBEITSGERICHT = { naam: 'Bundesarbeitsgericht (DE)',        url: 'https://www.bundesarbeitsgericht.de/presse/rss.xml' }
const DE_BUNDESTAG            = { naam: 'Bundestag (DE)',                   url: 'https://www.bundestag.de/rss/rss_meldungen' }
const DE_UBA                  = { naam: 'Umweltbundesamt (DE milieu)',      url: 'https://www.umweltbundesamt.de/service/rss-feed' }
const DE_BMAS                 = { naam: 'Bundesministerium Arbeit (DE)',    url: 'https://www.bmas.de/SiteGlobals/Functions/RSS/RSS.xml' }
const DE_DSK                  = { naam: 'Datenschutzkonferenz (DE privacy)',url: 'https://www.datenschutzkonferenz-online.de/rss.xml' }
const DE_BUNDESFINANZHOF      = { naam: 'Bundesfinanzhof (DE belasting)',   url: 'https://www.bundesfinanzhof.de/rss/urteile' }

// ─── FRANKRIJK ───────────────────────────────────────────────────────────────
const FR_LEGIFRANCE      = { naam: 'Légifrance (FR wetgeving)',             url: 'https://www.legifrance.gouv.fr/rss/content/jorf.rss' }
const FR_GOUVERNEMENT    = { naam: 'Gouvernement.fr',                      url: 'https://www.gouvernement.fr/flux-rss' }
const FR_CNIL            = { naam: 'CNIL (FR privacytoezicht)',             url: 'https://www.cnil.fr/fr/flux-rss-de-la-cnil' }
const FR_AMF             = { naam: 'AMF (FR financieel toezicht)',          url: 'https://www.amf-france.org/fr/rss.xml' }
const FR_ANSSI           = { naam: 'ANSSI (FR cybersecurity)',              url: 'https://www.ssi.gouv.fr/feed/' }
const FR_CONSEIL_ETAT    = { naam: "Conseil d'État (FR)",                  url: 'https://www.conseil-etat.fr/rss/actualites' }
const FR_DARES           = { naam: 'DARES (FR arbeidsmarkt)',               url: 'https://dares.travail-emploi.gouv.fr/rss.xml' }
const FR_ADEME           = { naam: 'ADEME (FR milieu/ESG)',                 url: 'https://www.ademe.fr/rss.xml' }

// ─── BELGIË ──────────────────────────────────────────────────────────────────
const BE_STAATSBLAD      = { naam: 'Belgisch Staatsblad',                   url: 'https://www.ejustice.just.fgov.be/cgi/rss.pl' }
const BE_OVERHEID        = { naam: 'Belgische overheid',                    url: 'https://www.belgium.be/nl/rss.xml' }
const BE_FSMA            = { naam: 'FSMA (BE financieel toezicht)',         url: 'https://www.fsma.be/nl/rss.xml' }
const BE_GBA             = { naam: 'GBA (BE privacytoezicht)',              url: 'https://www.gegevensbeschermingsautoriteit.be/nl/rss' }
const BE_NBB             = { naam: 'Nationale Bank van België',             url: 'https://www.nbb.be/nl/rss' }
const BE_FPS_EMPLOYMENT  = { naam: 'FOD Werkgelegenheid (BE)',              url: 'https://www.werk.belgie.be/nl/rss' }
const BE_ENVIRON         = { naam: 'OVAM (BE milieu)',                      url: 'https://www.ovam.be/rss.xml' }

// ─── SPANJE ──────────────────────────────────────────────────────────────────
const ES_BOE             = { naam: 'BOE (Spaans Staatsblad)',               url: 'https://www.boe.es/rss/canal.php?c=1' }
const ES_GOBIERNO        = { naam: 'Gobierno de España',                    url: 'https://www.lamoncloa.gob.es/rss/noticiasrss.xml' }
const ES_CNMV            = { naam: 'CNMV (ES financieel toezicht)',         url: 'https://www.cnmv.es/portal/RSS/RSS.aspx' }
const ES_AEPD            = { naam: 'AEPD (ES privacytoezicht)',             url: 'https://www.aepd.es/es/rss.xml' }

// ─── ITALIË ──────────────────────────────────────────────────────────────────
const IT_GAZZETTA        = { naam: 'Gazzetta Ufficiale (IT wetgeving)',     url: 'https://www.gazzettaufficiale.it/rss/homepage.xml' }
const IT_GOVERNO         = { naam: 'Governo Italiano',                     url: 'https://www.governo.it/it/rss.xml' }
const IT_CONSOB          = { naam: 'CONSOB (IT financieel toezicht)',       url: 'https://www.consob.it/web/consob/home/-/asset_publisher/rss' }
const IT_GARANTE         = { naam: 'Garante Privacy (IT)',                  url: 'https://www.garanteprivacy.it/rss' }

// ─── INTERNATIONAAL ──────────────────────────────────────────────────────────
const OECD               = { naam: 'OECD',                                  url: 'https://www.oecd.org/newsroom/rss.xml' }
const ILO                = { naam: 'ILO (internationale arbeidsorganisatie)',url: 'https://www.ilo.org/rss/en/thematic/labour-law.rss' }
const BIS                = { naam: 'BIS (Bank for International Settlements)',url: 'https://www.bis.org/doclist/all_speeches.rss' }
const FATF               = { naam: 'FATF (anti-witwassen)',                 url: 'https://www.fatf-gafi.org/en/publications/Fatfrecommendations/rss.xml' }
const WTO                = { naam: 'WTO',                                    url: 'https://www.wto.org/english/news_e/news_e.rss' }

// ─── BRONNEN PER LAND × VAKGEBIED ────────────────────────────────────────────
type BronEntry = { naam: string; url: string }

const BRONNEN_PER_LAND: Record<string, Record<string, BronEntry[]>> = {
  nl: {
    fiscaal:   [INKOMSTENBELAST, MIN_FINANCIEN, DNB, RECHTSPRAAK, RIJKSOVERHEID],
    finance:   [AFM_PROF, AFM_CONS, DNB, MIN_FINANCIEN, RECHTSPRAAK, RIJKSOVERHEID],
    hr:        [MIN_SZW, AWVN, ACM, RECHTSPRAAK, RIJKSOVERHEID],
    privacy:   [AP, NCSC, MIN_JV, MIN_BZK, RECHTSPRAAK, RIJKSOVERHEID],
    marketing: [ACM, MIN_EZK, RECHTSPRAAK, RIJKSOVERHEID],
    it:        [DTC, NCSC, AP, RECHTSPRAAK, RIJKSOVERHEID],
    esg:       [RVO, MIN_IW, MIN_EZK, RECHTSPRAAK, RIJKSOVERHEID],
    zorg:      [MIN_VWS, NZA, RECHTSPRAAK, RIJKSOVERHEID],
    algemeen:  [RIJKSOVERHEID, RECHTSPRAAK, ACM],
  },
  eu: {
    fiscaal:   [EUR_LEX, EU_COMMISSION, ECB, ESMA],
    finance:   [ESMA, EBA, EIOPA, ECB, EUR_LEX, EU_COMMISSION],
    hr:        [EUOSHA, EUR_LEX, EU_COMMISSION, EU_PARLIAMENT],
    privacy:   [EDPB, ENISA, EUR_LEX, EU_COMMISSION],
    marketing: [EUR_LEX, EU_COMMISSION, EU_PARLIAMENT],
    it:        [ENISA, EDPB, EUR_LEX, EU_COMMISSION],
    esg:       [EEA, EUR_LEX, EU_COMMISSION, EU_PARLIAMENT],
    zorg:      [EUR_LEX, EU_COMMISSION],
    algemeen:  [EUR_LEX_ALLE, EU_COMMISSION, EU_PARLIAMENT],
  },
  us: {
    fiscaal:   [IRS_US, FED_REGISTER_SIG, GOVINFO_US, FED_RESERVE],
    finance:   [SEC_US, FTC_US, FED_RESERVE, FED_REGISTER_SIG],
    hr:        [DOL_US, EEOC_US, NLRB_US, FED_REGISTER_SIG],
    privacy:   [FTC_US, CISA_US, FED_REGISTER_SIG, DOJ_US],
    marketing: [FTC_US, FED_REGISTER_SIG],
    it:        [CISA_US, FTC_US, FED_REGISTER_SIG],
    esg:       [EPA_US, FED_REGISTER_SIG, GOVINFO_US],
    zorg:      [HHS_US, FED_REGISTER_SIG],
    algemeen:  [FED_REGISTER, GOVINFO_US, DOJ_US],
  },
  uk: {
    fiscaal:   [UK_HMRC, UK_PRA, UK_LEGISLATION, UK_GOV_ALL],
    finance:   [UK_FCA, UK_PRA, UK_CMA, UK_LEGISLATION],
    hr:        [UK_HSE, UK_LEGISLATION, UK_GOV_ALL],
    privacy:   [UK_ICO, UK_NCSC, UK_LEGISLATION, UK_GOV_ALL],
    marketing: [UK_CMA, UK_GOV_ALL, UK_LEGISLATION],
    it:        [UK_NCSC, UK_ICO, UK_LEGISLATION, UK_GOV_ALL],
    esg:       [UK_ENV_AGENCY, UK_GOV_ALL, UK_LEGISLATION],
    zorg:      [UK_GOV_ALL, UK_LEGISLATION],
    algemeen:  [UK_LEGISLATION, UK_GOV_ALL, UK_COMPANIES_HOUSE],
  },
  de: {
    fiscaal:   [DE_BUNDESFINANZHOF, DE_BUNDESGESETZBLATT, DE_BUNDESREGIERUNG],
    finance:   [DE_BAFIN, DE_BUNDESFINANZHOF, DE_BUNDESGESETZBLATT, DE_BUNDESREGIERUNG],
    hr:        [DE_BUNDESARBEITSGERICHT, DE_BMAS, DE_BUNDESGESETZBLATT, DE_BUNDESREGIERUNG],
    privacy:   [DE_DSK, DE_BSI, DE_BUNDESGESETZBLATT, DE_BUNDESREGIERUNG],
    marketing: [DE_BUNDESTAG, DE_BUNDESREGIERUNG, DE_BUNDESGESETZBLATT],
    it:        [DE_BSI, DE_DSK, DE_BUNDESGESETZBLATT, DE_BUNDESREGIERUNG],
    esg:       [DE_UBA, DE_BUNDESREGIERUNG, DE_BUNDESGESETZBLATT],
    zorg:      [DE_BUNDESREGIERUNG, DE_BUNDESGESETZBLATT],
    algemeen:  [DE_BUNDESREGIERUNG, DE_BUNDESTAG, DE_BUNDESGESETZBLATT],
  },
  fr: {
    fiscaal:   [FR_LEGIFRANCE, FR_AMF, FR_GOUVERNEMENT],
    finance:   [FR_AMF, FR_LEGIFRANCE, FR_GOUVERNEMENT],
    hr:        [FR_DARES, FR_LEGIFRANCE, FR_GOUVERNEMENT],
    privacy:   [FR_CNIL, FR_ANSSI, FR_LEGIFRANCE],
    marketing: [FR_CONSEIL_ETAT, FR_GOUVERNEMENT, FR_LEGIFRANCE],
    it:        [FR_ANSSI, FR_CNIL, FR_LEGIFRANCE],
    esg:       [FR_ADEME, FR_GOUVERNEMENT, FR_LEGIFRANCE],
    zorg:      [FR_GOUVERNEMENT, FR_LEGIFRANCE],
    algemeen:  [FR_LEGIFRANCE, FR_GOUVERNEMENT, FR_CONSEIL_ETAT],
  },
  be: {
    fiscaal:   [BE_STAATSBLAD, BE_NBB, BE_FSMA, BE_OVERHEID],
    finance:   [BE_FSMA, BE_NBB, BE_STAATSBLAD, BE_OVERHEID],
    hr:        [BE_FPS_EMPLOYMENT, BE_STAATSBLAD, BE_OVERHEID],
    privacy:   [BE_GBA, BE_STAATSBLAD, BE_OVERHEID],
    marketing: [BE_OVERHEID, BE_STAATSBLAD],
    it:        [BE_GBA, BE_STAATSBLAD, BE_OVERHEID],
    esg:       [BE_ENVIRON, BE_OVERHEID, BE_STAATSBLAD],
    zorg:      [BE_OVERHEID, BE_STAATSBLAD],
    algemeen:  [BE_STAATSBLAD, BE_OVERHEID, BE_NBB],
  },
  es: {
    fiscaal:   [ES_BOE, ES_CNMV, ES_GOBIERNO],
    finance:   [ES_CNMV, ES_BOE, ES_GOBIERNO],
    hr:        [ES_BOE, ES_GOBIERNO],
    privacy:   [ES_AEPD, ES_BOE, ES_GOBIERNO],
    marketing: [ES_GOBIERNO, ES_BOE],
    it:        [ES_AEPD, ES_BOE, ES_GOBIERNO],
    esg:       [ES_GOBIERNO, ES_BOE],
    zorg:      [ES_GOBIERNO, ES_BOE],
    algemeen:  [ES_BOE, ES_GOBIERNO],
  },
  it_land: {
    fiscaal:   [IT_GAZZETTA, IT_CONSOB, IT_GOVERNO],
    finance:   [IT_CONSOB, IT_GAZZETTA, IT_GOVERNO],
    hr:        [IT_GAZZETTA, IT_GOVERNO],
    privacy:   [IT_GARANTE, IT_GAZZETTA, IT_GOVERNO],
    marketing: [IT_GOVERNO, IT_GAZZETTA],
    it:        [IT_GARANTE, IT_GAZZETTA, IT_GOVERNO],
    esg:       [IT_GOVERNO, IT_GAZZETTA],
    zorg:      [IT_GOVERNO, IT_GAZZETTA],
    algemeen:  [IT_GAZZETTA, IT_GOVERNO],
  },
  internationaal: {
    fiscaal:   [OECD, FATF, BIS],
    finance:   [BIS, FATF, OECD, WTO],
    hr:        [ILO, OECD],
    privacy:   [OECD, FATF],
    marketing: [WTO, OECD],
    it:        [OECD],
    esg:       [OECD, WTO],
    zorg:      [OECD],
    algemeen:  [OECD, WTO, ILO],
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
const TOEGESTANE_DOMEINEN = [
  '.nl', 'overheid.nl', 'rechtspraak.nl',
  'europa.eu', 'eur-lex.europa.eu',
  '.gov', 'federalregister.gov', 'govinfo.gov', 'sec.gov', 'ftc.gov',
  'legislation.gov.uk', 'parliament.uk', 'gov.uk', 'ico.org.uk',
  'fca.org.uk', 'bankofengland.co.uk', 'ncsc.gov.uk',
  'bundesregierung.de', 'bund.de', 'bafin.de', 'bundesarbeitsgericht.de', 'bundestag.de',
  'legifrance.gouv.fr', 'gouvernement.fr', 'cnil.fr', 'amf-france.org',
  'ssi.gouv.fr', 'conseil-etat.fr',
  'fgov.be', 'belgium.be', 'fsma.be', 'gegevensbeschermingsautoriteit.be', 'nbb.be',
  'boe.es', 'lamoncloa.gob.es', 'cnmv.es', 'aepd.es',
  'gazzettaufficiale.it', 'governo.it', 'consob.it', 'garanteprivacy.it',
  'oecd.org', 'ilo.org', 'fatf-gafi.org', 'wto.org', 'bis.org',
]

function isBetrouwbaarDomein(url: string): boolean {
  return TOEGESTANE_DOMEINEN.some(d => url.includes(d))
}

function normaliseerVakgebied(vakgebied: string): string {
  const lower = vakgebied.toLowerCase()
  if (lower.includes('fiscal') || lower.includes('belasting') || lower.includes('vpb') || lower.includes('btw') || lower.includes('tax')) return 'fiscaal'
  if (lower.includes('financ') || lower.includes('boekhoud') || lower.includes('accoun') || lower.includes('controller') || lower.includes('cfo') || lower.includes('treasury') || lower.includes('audit')) return 'finance'
  if (lower.includes('hr ') || lower.includes(' hr') || lower === 'hr' || lower.includes('human resource') || lower.includes('arbeid') || lower.includes('personeel') || lower.includes('cao') || lower.includes('recrut') || lower.includes('talent')) return 'hr'
  if (lower.includes('privacy') || lower.includes('avg') || lower.includes('gdpr') || lower.includes('data protec') || lower.includes('persoonsgegevens') || lower.includes('dpo') || lower.includes('compliance')) return 'privacy'
  if (lower.includes('marketing') || lower.includes('reclame') || lower.includes('communicat') || lower.includes('consument') || lower.includes('brand') || lower.includes('campagne')) return 'marketing'
  if (lower.includes('it') || lower.includes('ict') || lower.includes('cyber') || lower.includes('software') || lower.includes('tech') || lower.includes('digital') || lower.includes('security') || lower.includes('ciso') || lower.includes('cto')) return 'it'
  if (lower.includes('esg') || lower.includes('duurzaam') || lower.includes('milieu') || lower.includes('sustainab') || lower.includes('klimaat') || lower.includes('csrd')) return 'esg'
  if (lower.includes('zorg') || lower.includes('medisch') || lower.includes('gezondheid') || lower.includes('pharma') || lower.includes('care') || lower.includes('health')) return 'zorg'
  if (lower.includes('inkoop') || lower.includes('aanbesteding') || lower.includes('procurement') || lower.includes('supply')) return 'finance'
  if (lower.includes('legal') || lower.includes('juridisch') || lower.includes('jurist') || lower.includes('advocaat') || lower.includes('recht') || lower.includes('counsel')) return 'privacy'
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
  const vakSleutel  = normaliseerVakgebied(vakgebied)
  const extraOnderwerpen = opties?.extraOnderwerpen?.trim() ?? ''
  const branche = opties?.branche?.trim() ?? ''

  // Nationale bronnen ophalen
  const nationaleBronnen = BRONNEN_PER_LAND[landSleutel]?.[vakSleutel]
    ?? BRONNEN_PER_LAND[landSleutel]?.['algemeen']
    ?? BRONNEN_PER_LAND['nl']['algemeen']

  // Automatisch 2 EU-bronnen toevoegen voor niet-EU/internationaal landen
  const voegEuToe = !['eu', 'internationaal'].includes(landSleutel)
  const euAanvulling = voegEuToe
    ? (BRONNEN_PER_LAND['eu'][vakSleutel] ?? BRONNEN_PER_LAND['eu']['algemeen']).slice(0, 2)
    : []

  const basisBronnen = dedupliceer([...nationaleBronnen, ...euAanvulling])

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
      const gefilterd = extra.filter(b => b.naam && b.url && isBetrouwbaarDomein(b.url))
      return dedupliceer([...basisBronnen, ...gefilterd])
    } catch {
      // Aanvulling mislukt: ga door met basisBronnen
    }
  }

  return basisBronnen
}
