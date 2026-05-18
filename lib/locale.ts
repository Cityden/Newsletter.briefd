export type Locale = 'nl' | 'en'

export function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'nl'
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  return (match?.[1] as Locale) ?? 'nl'
}

export const teksten = {
  nl: {
    // Metadata
    siteTitle: 'Regelgeving Nieuwsbrief',
    siteDescription: 'Gepersonaliseerde updates over wetswijzigingen en juridische uitspraken',

    // Nav
    navHoe: 'Hoe het werkt',
    navVakgebieden: 'Vakgebieden',
    navAanmelden: 'Aanmelden →',

    // Hero
    badge: 'AI-gestuurde regelgeving updates',
    heroRegel1: 'Altijd op de hoogte van',
    heroOmschrijving: 'Brieft leest wekelijks alle officiële wetgeving, uitspraken en beleidsupdates. Jij krijgt alleen wat relevant is — samengevat, met bronverwijzingen.',
    ctaPrimair: 'Gratis aanmelden →',
    ctaSecundair: 'Hoe het werkt',
    garanties: ['Geen spam', 'Altijd uitschrijven', 'Alleen officiële bronnen'],
    vakgebieden: ['Finance', 'HR & Arbeidsrecht', 'Fiscaal', 'Marketing', 'Privacy & AVG', 'IT & Cybersecurity', 'ESG', 'Inkoop'],

    // Preview card
    previewLabel: 'Brieft · jouw vakgebied · week 17',
    previewUpdates: '2 updates',
    previewItems: [
      { impact: 'Hoge impact', type: 'Wetgeving', title: 'Nieuwe meldplicht datalekken — strengere termijn', desc: 'Organisaties moeten datalekken voortaan binnen 48 uur melden bij de toezichthouder. Eerder gold 72 uur. Geldt voor alle sectoren.' },
      { impact: 'Gemiddeld', type: 'Uitspraak', title: 'Rechter: mondeling contract ook bindend bij opdrachten boven €10k', desc: 'Hoge Raad bevestigt dat schriftelijk contract niet altijd vereist is, ook bij hogere bedragen...' },
    ],

    // Stats
    stats: [
      { getal: '30+', label: 'Officiële bronnen gemonitord' },
      { getal: 'Wekelijks', label: 'Elke maandag bijgewerkt' },
      { getal: '100%', label: 'Primaire overheidsbronnen' },
    ],

    // How it works
    hoeLabel: 'Hoe het werkt',
    hoeKop: 'Van officiële bron tot jouw inbox',
    stappen: [
      { num: '01', title: 'Jij vult in wat relevant is', desc: 'Vakgebied, organisatietype, extra voorkeuren en hoe vaak je updates wil.' },
      { num: '02', title: 'Brieft leest de bronnen', desc: 'Staatscourant, rechtspraak.nl, toezichthouders — alleen primaire overheidsbronnen.' },
      { num: '03', title: 'AI filtert en schrijft', desc: 'Relevante updates samengevat met praktijkvoorbeelden afgestemd op jouw profiel.' },
      { num: '04', title: 'Jij leest in 5 minuten', desc: 'Kort overzicht in je inbox. Klik door voor het volledige detail en de bronlink.' },
    ],

    // Fields
    vakgebiedenLabel: 'Vakgebieden',
    vakgebiedenKop: 'Voor elk vakgebied',
    vakgebiedenSub: 'Staat jouw vakgebied er niet bij? Typ het gewoon in — Brieft bepaalt zelf welke bronnen relevant zijn.',
    velden: [
      { naam: 'Fiscaal', bronnen: 'Belastingdienst · Staatscourant · Rechtspraak' },
      { naam: 'Finance', bronnen: 'AFM · DNB · EUR-Lex' },
      { naam: 'HR & Arbeidsrecht', bronnen: 'Rechtspraak · SZW · UWV' },
      { naam: 'Marketing', bronnen: 'ACM · AP · Reclame Code Commissie' },
      { naam: 'Privacy & AVG', bronnen: 'Autoriteit Persoonsgegevens · EUR-Lex' },
      { naam: 'IT & Cybersecurity', bronnen: 'NCSC · AP · ACM' },
      { naam: 'ESG & Duurzaamheid', bronnen: 'AFM · RVO · EUR-Lex' },
      { naam: 'Jouw vakgebied…', bronnen: 'Brieft zoekt automatisch de juiste bronnen', italic: true },
    ],

    // CTA section
    ctaKop: 'Klaar om bij te blijven?',
    ctaSub: 'Meld je aan en ontvang je eerste gepersonaliseerde nieuwsbrief volgende week.',
    ctaKnop: 'Gratis aanmelden →',
    ctaGaranties: ['Geen betaalgegevens', 'Direct opzegbaar', 'Gratis'],

    // Footer
    footerTagline: 'Alleen officiële Nederlandse en EU-bronnen',

    // Inschrijven
    inschrijvenStap1: 'Stap 1 van 2',
    inschrijvenTitel1: 'Jouw profiel',
    inschrijvenSub1: 'Vul in wie je bent, zodat Brieft de juiste updates kan selecteren.',
    inschrijvenStap2: 'Stap 2 van 2',
    inschrijvenTitel2: 'Jouw voorkeuren',
    inschrijvenSub2: 'Optioneel — maar hoe meer je invult, hoe relevanter je nieuwsbrief wordt.',
    labelNaam: 'Naam',
    labelEmail: 'E-mailadres',
    labelVakgebied: 'Vakgebied of functie',
    placeholderVakgebied: 'Bijv. Marketing, Finance, HR, Inkoop…',
    hintVakgebied: 'Vul vrij in — Brieft past zich automatisch aan',
    labelLand: 'Land',
    hintLand: 'Brieft selecteert bronnen passend bij jouw land',
    labelBranche: 'Branche',
    labelOrganisatie: 'Organisatie',
    labelFrequentie: 'Frequentie',
    labelTaal: 'Taal van de nieuwsbrief',
    labelRegio: 'Regio',
    hintRegio: 'Selecteer meerdere regio\'s als dat relevant is',
    labelExtraOnderwerpen: 'Extra onderwerpen of trefwoorden',
    placeholderExtraOnderwerpen: 'Bijv. pensioen, AI Act, cao detailhandel, DORA…',
    hintExtraOnderwerpen: 'Brieft let extra op updates die hierop aansluiten',
    labelAlleenHogeImpact: 'Alleen hoge-impact updates',
    hintAlleenHogeImpact: 'Ontvang alleen updates die directe actie vereisen',
    knopVolgende: 'Volgende →',
    knopTerug: '← Terug',
    knopAanmelden: 'Aanmelden',
    knopAanmeldenLaden: 'Aanmelden…',
    succesTitle: 'Je bent aangemeld!',
    succesSub: (freq: string) => `Je eerste nieuwsbrief ontvang je ${freq === 'wekelijks' ? 'volgende week maandag' : 'begin volgende maand'}.\nVia de link in de mail kun je je voorkeuren altijd aanpassen.`,
    knopTerugHome: '← Terug naar home',
    foutMelding: 'Er ging iets mis. Probeer het opnieuw.',
    optioneel: '(optioneel)',
    regioBeschrijving: 'Selecteer meerdere regio\'s als dat relevant is',

    // Extra form strings
    placeholderNaam: 'Jouw naam',
    placeholderEmail: 'jouw@email.nl',
    labelStijl: 'Schrijfstijl',
    placeholderBranche: 'Selecteer jouw branche…',
    hintBranche: 'Brieft houdt rekening met branche-specifieke regelgeving',
    footerNote: 'Via de link in elke mail kun je je voorkeuren aanpassen of je uitschrijven.',

    orgOpties: [
      { value: 'zzp', label: 'ZZP' },
      { value: 'mkb', label: 'MKB (10–250)' },
      { value: 'groot', label: 'Groot bedrijf (250+)' },
      { value: 'overheid', label: 'Overheid / non-profit' },
    ],
    stijlOpties: [
      { value: 'kort', label: 'Kort & bondig', desc: 'Alleen wat ik moet weten, max 5 min lezen' },
      { value: 'uitgebreid', label: 'Uitgebreid', desc: 'Met context, voorbeelden en achtergrond' },
    ],
    frequentieOpties: [
      { value: 'wekelijks', label: 'Wekelijks' },
      { value: 'maandelijks', label: 'Maandelijks' },
    ],
    regiOpties: ['Nederland', 'Europa (EU)', 'Internationaal'],
    landOpties: [
      { value: 'NL', label: 'Nederland' },
      { value: 'BE', label: 'België' },
      { value: 'DE', label: 'Duitsland' },
      { value: 'FR', label: 'Frankrijk' },
      { value: 'GB', label: 'Verenigd Koninkrijk' },
      { value: 'LU', label: 'Luxemburg' },
      { value: 'AT', label: 'Oostenrijk' },
      { value: 'CH', label: 'Zwitserland' },
      { value: 'ES', label: 'Spanje' },
      { value: 'IT', label: 'Italië' },
      { value: 'PL', label: 'Polen' },
      { value: 'DK', label: 'Denemarken' },
      { value: 'SE', label: 'Zweden' },
      { value: 'FI', label: 'Finland' },
      { value: 'IE', label: 'Ierland' },
      { value: 'US', label: 'Verenigde Staten' },
    ],
    taalOpties: [
      { value: '',           label: 'Automatisch (op basis van land)' },
      { value: 'Nederlands', label: 'Nederlands' },
      { value: 'Engels',     label: 'Engels' },
      { value: 'Duits',      label: 'Duits' },
      { value: 'Frans',      label: 'Frans' },
      { value: 'Spaans',     label: 'Spaans' },
      { value: 'Italiaans',  label: 'Italiaans' },
      { value: 'Pools',      label: 'Pools' },
      { value: 'Deens',      label: 'Deens' },
      { value: 'Zweeds',     label: 'Zweeds' },
      { value: 'Fins',       label: 'Fins' },
    ],
    brancheOpties: [
      'Horeca & Toerisme',
      'Detailhandel & Retail',
      'Financiële dienstverlening',
      'Gezondheidszorg & Welzijn',
      'Bouw & Vastgoed',
      'Industrie & Productie',
      'Transport & Logistiek',
      'ICT & Tech',
      'Onderwijs & Onderzoek',
      'Zakelijke dienstverlening',
      'Overheid & Non-profit',
      'Energie & Utilities',
      'Agri, Food & Farma',
      'Media & Communicatie',
      'Anders',
    ],
  },

  en: {
    // Metadata
    siteTitle: 'Regulatory Newsletter',
    siteDescription: 'Personalised updates on regulatory changes and legal rulings',

    // Nav
    navHoe: 'How it works',
    navVakgebieden: 'Fields',
    navAanmelden: 'Sign up →',

    // Hero
    badge: 'AI-powered regulatory updates',
    heroRegel1: 'Always on top of',
    heroOmschrijving: 'Brieft reads all official legislation, rulings and policy updates weekly. You only get what\'s relevant — summarised, with source references.',
    ctaPrimair: 'Sign up for free →',
    ctaSecundair: 'How it works',
    garanties: ['No spam', 'Unsubscribe anytime', 'Official sources only'],
    vakgebieden: ['Finance', 'HR & Employment Law', 'Tax', 'Marketing', 'Privacy & GDPR', 'IT & Cybersecurity', 'ESG', 'Procurement'],

    // Preview card
    previewLabel: 'Brieft · your field · week 17',
    previewUpdates: '2 updates',
    previewItems: [
      { impact: 'High impact', type: 'Legislation', title: 'New data breach notification rule — stricter deadline', desc: 'Organisations must now report data breaches within 48 hours to the regulator. Previously 72 hours applied. Covers all sectors.' },
      { impact: 'Medium', type: 'Court ruling', title: 'Court: verbal contract binding for engagements over €10k', desc: 'Supreme Court confirms written contract not always required, even for larger amounts...' },
    ],

    // Stats
    stats: [
      { getal: '30+', label: 'Official sources monitored' },
      { getal: 'Weekly', label: 'Updated every Monday' },
      { getal: '100%', label: 'Primary government sources' },
    ],

    // How it works
    hoeLabel: 'How it works',
    hoeKop: 'From official source to your inbox',
    stappen: [
      { num: '01', title: 'You fill in what matters', desc: 'Field, organisation type, extra preferences and how often you want updates.' },
      { num: '02', title: 'Brieft reads the sources', desc: 'Government gazettes, courts, regulators — primary official sources only.' },
      { num: '03', title: 'AI filters and writes', desc: 'Relevant updates summarised with practical examples tailored to your profile.' },
      { num: '04', title: 'You read in 5 minutes', desc: 'Brief overview in your inbox. Click through for full details and the source link.' },
    ],

    // Fields
    vakgebiedenLabel: 'Fields',
    vakgebiedenKop: 'For every field',
    vakgebiedenSub: 'Don\'t see your field? Just type it in — Brieft automatically finds the right sources.',
    velden: [
      { naam: 'Tax', bronnen: 'Tax authority · Official gazette · Courts' },
      { naam: 'Finance', bronnen: 'FCA · ECB · EUR-Lex' },
      { naam: 'HR & Employment Law', bronnen: 'Courts · Labour ministry · OECD' },
      { naam: 'Marketing', bronnen: 'Competition authority · Courts' },
      { naam: 'Privacy & GDPR', bronnen: 'Data protection authority · EUR-Lex' },
      { naam: 'IT & Cybersecurity', bronnen: 'ENISA · NCSC · Courts' },
      { naam: 'ESG & Sustainability', bronnen: 'EBA · RVO · EUR-Lex' },
      { naam: 'Your field…', bronnen: 'Brieft automatically finds the right sources', italic: true },
    ],

    // CTA section
    ctaKop: 'Ready to stay informed?',
    ctaSub: 'Sign up and receive your first personalised newsletter next week.',
    ctaKnop: 'Sign up for free →',
    ctaGaranties: ['No payment details', 'Cancel anytime', 'Free'],

    // Footer
    footerTagline: 'Official government and EU sources only',

    // Inschrijven
    inschrijvenStap1: 'Step 1 of 2',
    inschrijvenTitel1: 'Your profile',
    inschrijvenSub1: 'Tell us who you are so Brieft can select the right updates.',
    inschrijvenStap2: 'Step 2 of 2',
    inschrijvenTitel2: 'Your preferences',
    inschrijvenSub2: 'Optional — but the more you fill in, the more relevant your newsletter becomes.',
    labelNaam: 'Name',
    labelEmail: 'Email address',
    labelVakgebied: 'Field or role',
    placeholderVakgebied: 'E.g. Finance, HR, Marketing, Procurement…',
    hintVakgebied: 'Type freely — Brieft adapts automatically',
    labelLand: 'Country',
    hintLand: 'Brieft selects sources matching your country',
    labelBranche: 'Industry',
    labelOrganisatie: 'Organisation',
    labelFrequentie: 'Frequency',
    labelTaal: 'Newsletter language',
    labelRegio: 'Region',
    hintRegio: 'Select multiple regions if relevant',
    labelExtraOnderwerpen: 'Extra topics or keywords',
    placeholderExtraOnderwerpen: 'E.g. pension, AI Act, DORA, Basel IV…',
    hintExtraOnderwerpen: 'Brieft pays extra attention to updates matching these',
    labelAlleenHogeImpact: 'High-impact updates only',
    hintAlleenHogeImpact: 'Only receive updates requiring direct action',
    knopVolgende: 'Next →',
    knopTerug: '← Back',
    knopAanmelden: 'Sign up',
    knopAanmeldenLaden: 'Signing up…',
    succesTitle: 'You\'re signed up!',
    succesSub: (freq: string) => `Your first newsletter will arrive ${freq === 'wekelijks' ? 'next Monday' : 'at the start of next month'}.\nYou can update your preferences anytime via the link in the email.`,
    knopTerugHome: '← Back to home',
    foutMelding: 'Something went wrong. Please try again.',
    optioneel: '(optional)',
    regioBeschrijving: 'Select multiple regions if relevant',

    // Extra form strings
    placeholderNaam: 'Your name',
    placeholderEmail: 'your@email.com',
    labelStijl: 'Writing style',
    placeholderBranche: 'Select your industry…',
    hintBranche: 'Brieft takes industry-specific regulations into account',
    footerNote: 'Use the link in every email to update your preferences or unsubscribe.',

    orgOpties: [
      { value: 'zzp', label: 'Freelance / Sole trader' },
      { value: 'mkb', label: 'SME (10–250)' },
      { value: 'groot', label: 'Large organisation (250+)' },
      { value: 'overheid', label: 'Government / non-profit' },
    ],
    stijlOpties: [
      { value: 'kort', label: 'Brief & to the point', desc: 'Only what I need to know, max 5 min read' },
      { value: 'uitgebreid', label: 'In-depth', desc: 'With context, examples and background' },
    ],
    frequentieOpties: [
      { value: 'wekelijks', label: 'Weekly' },
      { value: 'maandelijks', label: 'Monthly' },
    ],
    regiOpties: ['Netherlands', 'Europe (EU)', 'International'],
    landOpties: [
      { value: 'NL', label: 'Netherlands' },
      { value: 'BE', label: 'Belgium' },
      { value: 'DE', label: 'Germany' },
      { value: 'FR', label: 'France' },
      { value: 'GB', label: 'United Kingdom' },
      { value: 'LU', label: 'Luxembourg' },
      { value: 'AT', label: 'Austria' },
      { value: 'CH', label: 'Switzerland' },
      { value: 'ES', label: 'Spain' },
      { value: 'IT', label: 'Italy' },
      { value: 'PL', label: 'Poland' },
      { value: 'DK', label: 'Denmark' },
      { value: 'SE', label: 'Sweden' },
      { value: 'FI', label: 'Finland' },
      { value: 'IE', label: 'Ireland' },
      { value: 'US', label: 'United States' },
    ],
    taalOpties: [
      { value: '',           label: 'Automatic (based on country)' },
      { value: 'Nederlands', label: 'Dutch' },
      { value: 'Engels',     label: 'English' },
      { value: 'Duits',      label: 'German' },
      { value: 'Frans',      label: 'French' },
      { value: 'Spaans',     label: 'Spanish' },
      { value: 'Italiaans',  label: 'Italian' },
      { value: 'Pools',      label: 'Polish' },
      { value: 'Deens',      label: 'Danish' },
      { value: 'Zweeds',     label: 'Swedish' },
      { value: 'Fins',       label: 'Finnish' },
    ],
    brancheOpties: [
      'Hospitality & Tourism',
      'Retail & E-commerce',
      'Financial Services',
      'Healthcare & Welfare',
      'Construction & Real Estate',
      'Industry & Manufacturing',
      'Transport & Logistics',
      'ICT & Tech',
      'Education & Research',
      'Professional Services',
      'Government & Non-profit',
      'Energy & Utilities',
      'Agri, Food & Pharma',
      'Media & Communications',
      'Other',
    ],
  },
} as const

export type Teksten = typeof teksten.nl
