/**
 * Volledige flow-test voor de Regelgeving Nieuwsbrief
 * Gebruik: node scripts/test-flow.mjs
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Laad .env.local ────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(r => r && !r.startsWith('#') && r.includes('='))
    .map(r => {
      const i = r.indexOf('=')
      return [r.slice(0, i).trim(), r.slice(i + 1).trim()]
    })
)

const BASE_URL         = 'http://localhost:3000'
const SUPABASE_URL     = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY     = env.SUPABASE_SERVICE_KEY
const ANTHROPIC_KEY    = env.ANTHROPIC_API_KEY

// ── Helpers ────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function ok(label) {
  console.log(`  ✓  ${label}`)
  passed++
}

function fail(label, detail = '') {
  console.error(`  ✗  ${label}${detail ? `\n       ${detail}` : ''}`)
  failed++
}

function sectie(titel) {
  const lijn = '─'.repeat(Math.max(2, 50 - titel.length))
  console.log(`\n── ${titel} ${lijn}`)
}

// ── Dummy artikelen ────────────────────────────────────────────────────────
const DUMMY_ARTIKELEN = [
  {
    titel: 'Wijziging Arbeidsomstandighedenbesluit per 1 januari 2025',
    url: 'https://www.rijksoverheid.nl/test-artikel-1',
    samenvatting: 'Het Arbeidsomstandighedenbesluit wordt gewijzigd om nieuwe normen voor thuiswerken op te nemen. Werkgevers krijgen een uitbreidde zorgplicht voor de thuiswerkplek van medewerkers.',
    gepubliceerdOp: new Date().toISOString(),
    bron: 'Rijksoverheid',
  },
  {
    titel: 'Rechtbank Amsterdam: ontslag wegens disfunctioneren onterecht',
    url: 'https://uitspraken.rechtspraak.nl/test-uitspraak-1',
    samenvatting: 'De rechtbank oordeelt dat het ontslag van een medewerker wegens disfunctioneren onterecht was omdat de werkgever geen verbetertraject had aangeboden.',
    gepubliceerdOp: new Date().toISOString(),
    bron: 'Rechtspraak.nl',
  },
  {
    titel: 'UWV verhoogt maximumdagloon per 1 juli 2025',
    url: 'https://www.uwv.nl/test-nieuws-1',
    samenvatting: 'Het maximumdagloon stijgt per 1 juli 2025 van €274,63 naar €281,22. Dit heeft gevolgen voor de berekening van WW- en WIA-uitkeringen.',
    gepubliceerdOp: new Date().toISOString(),
    bron: 'UWV',
  },
]

// ── Test 1: Config check ───────────────────────────────────────────────────
sectie('1. Configuratie')

if (SUPABASE_URL) ok('NEXT_PUBLIC_SUPABASE_URL aanwezig')
else fail('NEXT_PUBLIC_SUPABASE_URL ontbreekt')

if (SUPABASE_KEY) ok('SUPABASE_SERVICE_KEY aanwezig')
else fail('SUPABASE_SERVICE_KEY ontbreekt')

if (ANTHROPIC_KEY) ok('ANTHROPIC_API_KEY aanwezig')
else fail('ANTHROPIC_API_KEY ontbreekt')

if (env.RESEND_API_KEY) ok('RESEND_API_KEY aanwezig')
else fail('RESEND_API_KEY ontbreekt')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\nKritieke variabelen ontbreken — test afgebroken.')
  process.exit(1)
}

// ── Test 2: Dev server bereikbaar ─────────────────────────────────────────
sectie('2. Dev server')

const testEmail = `flowtest+${Date.now()}@example.com`

try {
  const res = await fetch(`${BASE_URL}/`)
  if (res.status === 200 || res.status === 307 || res.redirected) {
    ok(`Dev server reageert op ${BASE_URL}`)
  } else {
    fail(`Onverwachte statuscode: ${res.status}`)
  }
} catch {
  fail(`Dev server niet bereikbaar op ${BASE_URL} — draait npm run dev?`)
  process.exit(1)
}

// ── Test 3: Aanmelden via API ──────────────────────────────────────────────
sectie('3. POST /api/subscribers — aanmelden')

const aanmeldData = {
  naam: 'Flow Test',
  email: testEmail,
  vakgebied: 'HR',
  organisatie: 'mkb',
  frequentie: 'wekelijks',
}

let aanmeldOk = false
try {
  const res = await fetch(`${BASE_URL}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aanmeldData),
  })
  const body = await res.json()

  if (res.ok && body.ok) {
    ok(`Aanmelding geaccepteerd (HTTP ${res.status})`)
    aanmeldOk = true
  } else {
    fail(`API gaf fout terug (HTTP ${res.status})`, JSON.stringify(body))
  }
} catch (e) {
  fail('Aanmelding mislukt door netwerkfout', e.message)
}

// ── Test 4: Validatie — ongeldig e-mailadres ───────────────────────────────
sectie('4. POST /api/subscribers — validatie')

try {
  const res = await fetch(`${BASE_URL}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...aanmeldData, email: 'geen-geldig-email' }),
  })
  if (res.status === 400) ok('Ongeldig e-mailadres correct geweigerd (400)')
  else fail(`Verwacht 400, kreeg ${res.status}`)
} catch (e) {
  fail('Validatietest mislukt', e.message)
}

try {
  const res = await fetch(`${BASE_URL}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...aanmeldData, organisatie: 'onbekend' }),
  })
  if (res.status === 400) ok('Ongeldig organisatietype correct geweigerd (400)')
  else fail(`Verwacht 400, kreeg ${res.status}`)
} catch (e) {
  fail('Validatietest mislukt', e.message)
}

try {
  const res = await fetch(`${BASE_URL}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ naam: '', email: '', vakgebied: '' }),
  })
  if (res.status === 400) ok('Lege verplichte velden correct geweigerd (400)')
  else fail(`Verwacht 400, kreeg ${res.status}`)
} catch (e) {
  fail('Validatietest mislukt', e.message)
}

// ── Test 5: Subscriber in Supabase ────────────────────────────────────────
sectie('5. Supabase — subscriber opgeslagen')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
let token = null

if (aanmeldOk) {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('id, naam, email, vakgebied, organisatie, frequentie, actief, token, bronnen')
      .eq('email', testEmail)
      .single()

    if (error || !data) {
      fail('Subscriber niet gevonden in Supabase', error?.message)
    } else {
      ok(`Subscriber aanwezig (id: ${data.id})`)
      token = data.token

      data.naam === aanmeldData.naam       ? ok('Naam correct opgeslagen')       : fail('Naam klopt niet', `${data.naam}`)
      data.vakgebied === aanmeldData.vakgebied ? ok('Vakgebied correct opgeslagen') : fail('Vakgebied klopt niet')
      data.actief === true                 ? ok('Actief = true')                 : fail('Actief is niet true')
      token                                ? ok('Token aanwezig')                : fail('Token ontbreekt')
      Array.isArray(data.bronnen) && data.bronnen.length > 0
        ? ok(`Bronnen opgeslagen (${data.bronnen.length} stuks)`)
        : fail('Bronnen zijn leeg of ontbreken')
    }
  } catch (e) {
    fail('Supabase query mislukt', e.message)
  }
} else {
  fail('Supabase check overgeslagen — aanmelding was mislukt')
}

// ── Test 6: GET /api/subscribers/[token] ──────────────────────────────────
sectie('6. GET /api/subscribers/[token] — profiel ophalen')

if (token) {
  try {
    const res = await fetch(`${BASE_URL}/api/subscribers/${token}`)
    const body = await res.json()

    if (res.ok && body.email === testEmail) {
      ok(`Profiel opgehaald via token`)
      ok(`E-mail klopt: ${body.email}`)
    } else {
      fail(`Profiel ophalen mislukt (HTTP ${res.status})`, JSON.stringify(body))
    }
  } catch (e) {
    fail('GET token route mislukt', e.message)
  }

  // Ongeldige token
  try {
    const res = await fetch(`${BASE_URL}/api/subscribers/00000000-0000-0000-0000-000000000000`)
    if (res.status === 404) ok('Ongeldig token correct geweigerd (404)')
    else fail(`Verwacht 404, kreeg ${res.status}`)
  } catch (e) {
    fail('Token validatietest mislukt', e.message)
  }
} else {
  fail('Token test overgeslagen — token niet beschikbaar')
}

// ── Test 7: PATCH /api/subscribers/[token] ────────────────────────────────
sectie('7. PATCH /api/subscribers/[token] — voorkeuren bijwerken')

if (token) {
  try {
    const res = await fetch(`${BASE_URL}/api/subscribers/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vakgebied: 'Finance', frequentie: 'maandelijks' }),
    })
    const body = await res.json()

    if (res.ok && body.ok) {
      ok('Voorkeuren bijgewerkt')

      const { data } = await supabase
        .from('subscribers')
        .select('vakgebied, frequentie')
        .eq('token', token)
        .single()

      data?.vakgebied === 'Finance'      ? ok('Vakgebied correct bijgewerkt')  : fail('Vakgebied niet bijgewerkt')
      data?.frequentie === 'maandelijks' ? ok('Frequentie correct bijgewerkt') : fail('Frequentie niet bijgewerkt')
    } else {
      fail(`PATCH mislukt (HTTP ${res.status})`, JSON.stringify(body))
    }
  } catch (e) {
    fail('PATCH test mislukt', e.message)
  }
} else {
  fail('PATCH test overgeslagen — token niet beschikbaar')
}

// ── Test 8: Nieuwsbrief-generatie met dummy artikelen ─────────────────────
sectie('8. Nieuwsbrief-generatie (Claude API)')

if (!ANTHROPIC_KEY) {
  fail('Overgeslagen — ANTHROPIC_API_KEY ontbreekt')
} else {
  try {
    const artikelTekst = DUMMY_ARTIKELEN.map((a, i) =>
      `[${i + 1}] TITEL: ${a.titel}\nBRON: ${a.bron}\nURL: ${a.url}\nDATUM: ${a.gepubliceerdOp}\nSAMENVATTING: ${a.samenvatting}`
    ).join('\n\n---\n\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: 'Je bent een redacteur. Retourneer een JSON-object met "onderwerp" (string) en "items" (array met minstens 1 item met velden: titel, impact, type, samenvatting, actie, bronUrl, bronNaam, datum, vergelijkingstabel). Geen uitleg, alleen JSON.',
        messages: [{
          role: 'user',
          content: `Vakgebied: HR\nOrganisatie: MKB\n\n${artikelTekst}`,
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      fail('Claude API gaf fout terug', data.error?.message ?? JSON.stringify(data))
    } else {
      ok('Claude API reageert')

      const tekst = data.content?.[0]?.text ?? ''
      try {
        const parsed = JSON.parse(tekst.replace(/```json|```/g, '').trim())
        parsed.onderwerp ? ok(`Onderwerp gegenereerd: "${parsed.onderwerp}"`)  : fail('Geen onderwerp in response')
        Array.isArray(parsed.items) && parsed.items.length > 0
          ? ok(`${parsed.items.length} nieuwsbrief-item(s) gegenereerd`)
          : fail('Geen items in response')
      } catch {
        fail('Claude response is geen geldige JSON', tekst.slice(0, 200))
      }
    }
  } catch (e) {
    fail('Claude API aanroep mislukt', e.message)
  }
}

// ── Test 9: Opruimen testdata ─────────────────────────────────────────────
sectie('9. Opruimen testdata')

try {
  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('email', testEmail)

  if (error) fail('Testdata verwijderen mislukt', error.message)
  else ok(`Testsubscriber (${testEmail}) verwijderd`)
} catch (e) {
  fail('Opruimen mislukt', e.message)
}

// ── Resultaat ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`)
console.log(`  Resultaat: ${passed} geslaagd, ${failed} mislukt`)
console.log(`${'─'.repeat(52)}\n`)

process.exit(failed > 0 ? 1 : 0)
