// Beschrijving van de agent-architectuur: welke agent bestaat, in welk domein
// hij hoort, en welke concrete onderdelen hij aanraakt (bronbestand, model,
// route, tabel, cron, externe dienst).
//
// Dit bestand is met de hand onderhouden en beschrijft de *structuur*. De
// actuele *status* per agent komt live uit agent_runs via
// /api/admin/architectuur — zie ArchitectuurCanvas. Die splitsing is bewust:
// de structuur verandert alleen als je code schrijft, de status elke run.
//
// Bij het toevoegen van een agent: zet hem hier neer én laat de naam exact
// overeenkomen met de `agent`-waarde die je aan logAgentRun meegeeft, anders
// blijft zijn live-badge leeg.

export type Status = 'actief' | 'gepland'

export type OnderdeelSoort = 'bestand' | 'model' | 'route' | 'tabel' | 'cron' | 'dienst'

export interface Onderdeel {
  soort: OnderdeelSoort
  label: string
}

// De gedeelde bronnen in het midden van de kaart: waar de agents hun
// informatie vandaan halen. Bewust los van `onderdelen` — een onderdeel hoort
// bij één agent, een bron wordt door meerdere agents gebruikt.
export type BronId = 'rss' | 'anthropic' | 'supabase'

export interface Bron {
  id: BronId
  naam: string
  detail: string
  toelichting: string
  hoek: number // positie rond het exacte midden
}

export const BRONNEN: Bron[] = [
  {
    id: 'rss',
    naam: 'RSS-bronnen',
    // Handmatig geteld uit lib/sources.ts. Werk dit bij als je de catalogus
    // wijzigt; `npm run check:bronnen` laat zien wat er nog leeft.
    detail: '28 feeds · 16 landen',
    toelichting: 'De geverifieerde feedlijst in lib/sources.ts, per land en vakgebied. Opgehaald door lib/fetcher.ts.',
    hoek: 0,
  },
  {
    id: 'anthropic',
    naam: 'Anthropic API',
    detail: 'sonnet-4-6 · haiku-4-5',
    toelichting: 'api.anthropic.com/v1/messages. Gebruikt door classificatie, redactie, kwaliteitscontrole en herziening.',
    hoek: 120,
  },
  {
    id: 'supabase',
    naam: 'Supabase',
    detail: '5 tabellen',
    toelichting: 'subscribers · gepubliceerde_items · concept_nieuwsbrieven · nieuwsbrief_log · agent_runs',
    hoek: 240,
  },
]

export interface AgentNode {
  id: string
  naam: string
  beschrijving: string
  trigger: string
  status: Status
  /** Welke gedeelde bronnen deze agent leest. Leeg bij geplande agents. */
  bronnen: BronId[]
  onderdelen: Onderdeel[]
}

export interface Domein {
  id: string
  naam: string
  ondertitel: string
  hoek: number // graden, 0 = boven, met de klok mee
  kleur: string
  agents: AgentNode[]
}

export const SOORT_LABEL: Record<OnderdeelSoort, string> = {
  bestand: 'Bestand',
  model: 'Model',
  route: 'Route',
  tabel: 'Tabel',
  cron: 'Cron',
  dienst: 'Dienst',
}

// Vorm per soort, zodat je zonder legenda te lezen ziet wat een node is.
export const SOORT_VORM: Record<OnderdeelSoort, 'cirkel' | 'vierkant' | 'ruit' | 'driehoek'> = {
  bestand: 'cirkel',
  model: 'ruit',
  route: 'vierkant',
  tabel: 'vierkant',
  cron: 'driehoek',
  dienst: 'ruit',
}

export const DOMEINEN: Domein[] = [
  {
    id: 'content',
    naam: 'CONTENT & REDACTIE',
    ondertitel: 'scout · classificatie · redactie · kwaliteitscontrole · verzending',
    hoek: 0,
    kleur: '#4ade80',
    agents: [
      {
        id: 'scout',
        naam: 'Scout',
        beschrijving: 'Haalt ruwe artikelen op uit de RSS-bronnenlijst per vakgebied.',
        trigger: 'Bij elke verzendrun en bij de conceptrun',
        status: 'actief',
        bronnen: ['rss'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/scout.ts' },
          { soort: 'bestand', label: 'lib/fetcher.ts' },
          { soort: 'route', label: '/api/send-newsletter' },
          { soort: 'route', label: '/api/concept' },
          { soort: 'cron', label: 'ma 08:00' },
        ],
      },
      {
        id: 'classificatie',
        naam: 'Classificatie',
        beschrijving: 'Scoort relevantie per artikel voordat de dure redactie-stap begint.',
        trigger: 'Na scout, binnen dezelfde run',
        status: 'actief',
        bronnen: ['anthropic'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/classificatie.ts' },
          { soort: 'model', label: 'claude-haiku-4-5' },
          { soort: 'bestand', label: 'lib/fetcher.ts' },
          { soort: 'route', label: '/api/send-newsletter' },
          { soort: 'route', label: '/api/concept' },
        ],
      },
      {
        id: 'redactie',
        naam: 'Redactie',
        beschrijving: 'Schrijft samenvatting + actie, uitsluitend op basis van de brontekst.',
        trigger: 'Na classificatie',
        status: 'actief',
        bronnen: ['anthropic'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/redactie.ts' },
          { soort: 'model', label: 'claude-sonnet-4-6' },
          { soort: 'bestand', label: 'lib/generator.ts' },
          { soort: 'route', label: '/api/send-newsletter' },
          { soort: 'route', label: '/api/concept' },
        ],
      },
      {
        id: 'kwaliteitscontrole',
        naam: 'Kwaliteitscontrole',
        beschrijving: 'Fact-check per item tegen de bron. Bij twijfel: afkeuren, niet gokken.',
        trigger: 'Na redactie, per item',
        status: 'actief',
        bronnen: ['anthropic'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/kwaliteitscontrole.ts' },
          { soort: 'model', label: 'claude-sonnet-4-6' },
          { soort: 'route', label: '/api/send-newsletter' },
          { soort: 'route', label: '/api/concept' },
        ],
      },
      {
        id: 'personalisatie',
        naam: 'Personalisatie & verzend',
        beschrijving: 'Bouwt de HTML en verstuurt — alleen goedgekeurde items.',
        trigger: 'Na kwaliteitscontrole',
        status: 'actief',
        bronnen: ['supabase'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/personalisatie.ts' },
          { soort: 'bestand', label: 'lib/generator.ts' },
          { soort: 'dienst', label: 'Resend' },
          { soort: 'route', label: '/api/send-newsletter' },
          { soort: 'route', label: '/api/goedkeuren' },
          { soort: 'tabel', label: 'concept_nieuwsbrieven' },
          { soort: 'cron', label: 'vr 08:00 (concept)' },
        ],
      },
    ],
  },
  {
    id: 'marketing',
    naam: 'MARKETING & GROEI',
    ondertitel: 'onboarding · groeirapport',
    hoek: 90,
    kleur: '#60a5fa',
    agents: [
      {
        id: 'onboarding',
        naam: 'Onboarding',
        beschrijving: 'Dag-3 vervolgmail met vakgebied-context na aanmelding.',
        trigger: 'Dagelijks, 10:00',
        status: 'actief',
        bronnen: ['supabase'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/onboarding.ts' },
          { soort: 'tabel', label: 'subscribers' },
          { soort: 'dienst', label: 'Resend' },
          { soort: 'bestand', label: 'lib/generator.ts' },
          { soort: 'route', label: '/api/onboarding' },
          { soort: 'cron', label: 'dagelijks 10:00' },
        ],
      },
      {
        id: 'groeirapport',
        naam: 'Groeirapport',
        beschrijving: 'Maandmail: aanmeldingen, opzeggingen, vakgebied-verdeling.',
        trigger: 'Maandelijks, 1e dag 08:00',
        status: 'actief',
        bronnen: ['supabase'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/groeirapport.ts' },
          { soort: 'tabel', label: 'subscribers' },
          { soort: 'bestand', label: 'lib/agents/alert.ts' },
          { soort: 'route', label: '/api/groeirapport' },
          { soort: 'cron', label: '1e vd maand 08:00' },
        ],
      },
      {
        id: 'social',
        naam: 'Social content',
        beschrijving: 'Zet de belangrijkste update van de week om in een conceptpost.',
        trigger: 'Gepland — nog niet gebouwd',
        status: 'gepland',
        bronnen: [],
        onderdelen: [],
      },
    ],
  },
  {
    id: 'backoffice',
    naam: 'BACKOFFICE & OPERATIONS',
    ondertitel: 'watchdog · herziening',
    hoek: 180,
    kleur: '#fbbf24',
    agents: [
      {
        id: 'watchdog',
        naam: 'Watchdog',
        beschrijving: 'Leest agent_runs, mailt alleen bij problemen of een stille cron.',
        trigger: 'Dagelijks, 09:00',
        status: 'actief',
        bronnen: ['supabase'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/watchdog.ts' },
          { soort: 'tabel', label: 'agent_runs' },
          { soort: 'bestand', label: 'lib/agents/alert.ts' },
          { soort: 'route', label: '/api/watchdog' },
          { soort: 'cron', label: 'dagelijks 09:00' },
        ],
      },
      {
        id: 'herziening',
        naam: 'Herziening',
        beschrijving: 'Checkt gepubliceerde items periodiek opnieuw tegen de bron.',
        trigger: 'Wekelijks, woensdag 09:00',
        status: 'actief',
        bronnen: ['supabase', 'anthropic'],
        onderdelen: [
          { soort: 'bestand', label: 'lib/agents/herziening.ts' },
          { soort: 'tabel', label: 'gepubliceerde_items' },
          { soort: 'model', label: 'claude-haiku-4-5' },
          { soort: 'bestand', label: 'lib/agents/alert.ts' },
          { soort: 'route', label: '/api/herziening' },
          { soort: 'cron', label: 'wo 09:00' },
        ],
      },
      {
        id: 'facturatie',
        naam: 'Facturatie',
        beschrijving: 'Genereert facturen bij Mollie-betalingen.',
        trigger: 'Gepland — wacht op KVK/Moneybird-koppeling',
        status: 'gepland',
        bronnen: [],
        onderdelen: [],
      },
    ],
  },
  {
    id: 'klantenservice',
    naam: 'KLANTENSERVICE',
    ondertitel: 'triage · FAQ — nog niet gebouwd',
    hoek: 270,
    kleur: '#6b7280',
    agents: [
      {
        id: 'triage',
        naam: 'Inbox triage',
        beschrijving: 'Herkent vraag/opzeggen/klacht in binnenkomende mail.',
        trigger: 'Gepland — wacht op Resend Inbound',
        status: 'gepland',
        bronnen: [],
        onderdelen: [],
      },
      {
        id: 'faq',
        naam: 'FAQ-antwoord',
        beschrijving: 'Beantwoordt standaardvragen als concept, niet auto-send.',
        trigger: 'Gepland — wacht op Resend Inbound',
        status: 'gepland',
        bronnen: [],
        onderdelen: [],
      },
    ],
  },
]

// Live status per agent, zoals /api/admin/architectuur hem teruggeeft.
export interface AgentStatus {
  laatsteStatus: string | null
  laatsteRun: string | null
  duurMs: number | null
  reden: string | null
  runs7d: number
  mislukt7d: number
}

export type StatusMap = Record<string, AgentStatus>
