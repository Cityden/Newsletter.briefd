#!/usr/bin/env node
// Controleert elke RSS-feed: bestaat hij, en levert hij items op?
//
//   npm run check:bronnen           # leest de tabel `bronnen` in Supabase
//   npm run check:bronnen -- --code # leest de catalogus in lib/sources.ts
//
// Aanleiding: in augustus 2026 bleek 76 van de 96 feeds in de catalogus dood.
// Omdat fetchFeed een fout logt en doorgaat, kregen abonnees stilletjes lege of
// irrelevante nieuwsbrieven. Een dode feed moet hier opvallen, niet in iemands mail.
//
// De database is sinds de migratie leidend, dus die leest dit script standaard —
// anders keurt het een catalogus goed die niet is wat er draait. Met --code toets
// je de fallback in lib/sources.ts, die actueel moet blijven als noodrem.
//
// De bronwachter-agent doet dagelijks hetzelfde werk en werkt de status bij; dit
// script is de handmatige variant voor vóór een release.

import { readFileSync } from 'node:fs'

const FORCEER_CODE = process.argv.includes('--code')

function uitCode() {
  const inhoud = readFileSync(new URL('../lib/sources.ts', import.meta.url), 'utf8')
  const bronnen = [...inhoud.matchAll(/naam: '([^']+)',\s*url: '([^']+)'/g)]
    .map(m => ({ naam: m[1], url: m[2], status: 'actief' }))
  if (bronnen.length === 0) {
    console.error('Geen bronnen gevonden in lib/sources.ts — is het formaat gewijzigd?')
    process.exit(1)
  }
  // Eén rij per unieke url; de catalogus noemt bronnen vaker.
  return [...new Map(bronnen.map(b => [b.url, b])).values()]
}

async function uitDatabase() {
  const env = {}
  try {
    for (const regel of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = regel.match(/^([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch {
    return null
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null

  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/bronnen?select=naam,url,status&status=in.(actief,quarantaine)`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
    )
    if (!res.ok) return null
    const rijen = await res.json()
    if (!Array.isArray(rijen) || rijen.length === 0) return null
    // De tabel heeft één rij per (url, land, categorie); meet elke feed één keer.
    return [...new Map(rijen.map(r => [r.url, r])).values()]
  } catch {
    return null
  }
}

let bronnen
let herkomst
if (FORCEER_CODE) {
  bronnen = uitCode()
  herkomst = 'lib/sources.ts (geforceerd met --code)'
} else {
  const db = await uitDatabase()
  if (db) {
    bronnen = db
    herkomst = 'tabel `bronnen` in Supabase'
  } else {
    bronnen = uitCode()
    herkomst = 'lib/sources.ts — DATABASE NIET GELEZEN, dit is de fallback'
  }
}

console.log(`Bron van de lijst: ${herkomst}`)
console.log(`${bronnen.length} unieke feeds\n`)

const UA = 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)'

// Moet ruimer zijn dan de timeout in fetchFeed, anders keurt dit script een feed
// af die in productie nog net binnenkomt.
const TIMEOUT_MS = 25000
// Boven deze grens is een feed nog niet kapot, maar wel een risico: fetchFeed
// breekt af op 20s. Zo zie je het aankomen voordat de bron stil uitvalt.
const TRAAG_MS = 10000

async function check({ naam, url, status }) {
  const start = Date.now()
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const duur = Date.now() - start
    if (!res.ok) return { naam, url, status, ok: false, duur, reden: `HTTP ${res.status}` }
    const xml = await res.text()
    const items = (xml.match(/<item[ >]|<entry[ >]/g) ?? []).length
    return items > 0
      ? { naam, url, status, ok: true, items, duur }
      : { naam, url, status, ok: false, duur, reden: 'geen items in de feed' }
  } catch (err) {
    return { naam, url, status, ok: false, duur: Date.now() - start, reden: err.name === 'TimeoutError' ? 'timeout' : err.message }
  }
}

const resultaten = await Promise.all(bronnen.map(check))

// Een bron in quarantaine is al uit de rotatie gehaald; die mag deze controle niet
// laten falen. Wel tonen, want als hij het weer doet wil je hem terugzetten.
const actief = resultaten.filter(r => r.status !== 'quarantaine')
const inQuarantaine = resultaten.filter(r => r.status === 'quarantaine')
const kapot = actief.filter(r => !r.ok)
const traag = actief.filter(r => r.ok && r.duur > TRAAG_MS)

for (const r of actief.filter(r => r.ok).sort((a, b) => a.naam.localeCompare(b.naam))) {
  const merk = r.duur > TRAAG_MS ? ' TRAAG' : ''
  console.log(`  ok    ${String(r.items).padStart(4)} items  ${(r.duur / 1000).toFixed(1)}s${merk.padEnd(6)}  ${r.naam}`)
}
for (const r of kapot) {
  console.log(`  KAPOT  ${r.reden.padEnd(14)} ${r.naam} — ${r.url}`)
}
for (const r of inQuarantaine) {
  const oordeel = r.ok ? `werkt weer (${r.items} items) — overweeg terugzetten op actief` : r.reden
  console.log(`  quarantaine  ${r.naam} — ${oordeel}`)
}

console.log(`\n${actief.length - kapot.length}/${actief.length} actieve feeds werken.`)

if (traag.length > 0) {
  console.log(`${traag.length} feed(s) trager dan ${TRAAG_MS / 1000}s — fetchFeed breekt af op 20s:`)
  for (const r of traag) console.log(`  ${(r.duur / 1000).toFixed(1)}s  ${r.naam}`)
}

if (kapot.length > 0) {
  console.error(`\n${kapot.length} actieve feed(s) kapot. Zet ze in Supabase op quarantaine of vervang ze` +
    ` (en houd lib/sources.ts gelijk, dat is de noodrem).`)
  process.exit(1)
}
