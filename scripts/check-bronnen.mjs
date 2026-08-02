#!/usr/bin/env node
// Controleert elke RSS-feed in lib/sources.ts: bestaat hij, en levert hij items op?
//
// Draai dit vóór elke release en na elke wijziging aan de bronnenlijst:
//   npm run check:bronnen
//
// Aanleiding: in augustus 2026 bleek 76 van de 96 feeds in de catalogus dood.
// Omdat fetchFeed een fout logt en doorgaat, kregen abonnees stilletjes lege of
// irrelevante nieuwsbrieven. Een dode feed moet hier opvallen, niet in iemands mail.

import { readFileSync } from 'node:fs'

const bestand = new URL('../lib/sources.ts', import.meta.url)
const inhoud = readFileSync(bestand, 'utf8')

const bronnen = [...inhoud.matchAll(/naam: '([^']+)',\s*url: '([^']+)'/g)]
  .map(m => ({ naam: m[1], url: m[2] }))

if (bronnen.length === 0) {
  console.error('Geen bronnen gevonden in lib/sources.ts — is het formaat gewijzigd?')
  process.exit(1)
}

const UA = 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)'

// Moet ruimer zijn dan de timeout in fetchFeed, anders keurt dit script een feed
// af die in productie nog net binnenkomt.
const TIMEOUT_MS = 25000
// Boven deze grens is een feed nog niet kapot, maar wel een risico: fetchFeed
// breekt af op 20s. Zo zie je het aankomen voordat de bron stil uitvalt.
const TRAAG_MS = 10000

async function check({ naam, url }) {
  const start = Date.now()
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const duur = Date.now() - start
    if (!res.ok) return { naam, url, ok: false, reden: `HTTP ${res.status}` }
    const xml = await res.text()
    const items = (xml.match(/<item[ >]|<entry[ >]/g) ?? []).length
    return items > 0
      ? { naam, url, ok: true, items, duur }
      : { naam, url, ok: false, reden: 'geen items in de feed' }
  } catch (err) {
    return { naam, url, ok: false, reden: err.name === 'TimeoutError' ? 'timeout' : err.message }
  }
}

const resultaten = await Promise.all(bronnen.map(check))
const kapot = resultaten.filter(r => !r.ok)

const traag = resultaten.filter(r => r.ok && r.duur > TRAAG_MS)

for (const r of resultaten.filter(r => r.ok).sort((a, b) => a.naam.localeCompare(b.naam))) {
  const merk = r.duur > TRAAG_MS ? ' TRAAG' : ''
  console.log(`  ok    ${String(r.items).padStart(4)} items  ${(r.duur / 1000).toFixed(1)}s${merk.padEnd(6)}  ${r.naam}`)
}
for (const r of kapot) {
  console.log(`  KAPOT  ${r.reden.padEnd(14)} ${r.naam} — ${r.url}`)
}

console.log(`\n${resultaten.length - kapot.length}/${resultaten.length} feeds werken.`)

if (traag.length > 0) {
  console.log(`${traag.length} feed(s) trager dan ${TRAAG_MS / 1000}s — fetchFeed breekt af op 20s:`)
  for (const r of traag) console.log(`  ${(r.duur / 1000).toFixed(1)}s  ${r.naam}`)
}

if (kapot.length > 0) {
  console.error(`\n${kapot.length} feed(s) kapot. Vervang ze of haal ze uit lib/sources.ts.`)
  process.exit(1)
}
