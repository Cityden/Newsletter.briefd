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

async function check({ naam, url }) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return { naam, url, ok: false, reden: `HTTP ${res.status}` }
    const xml = await res.text()
    const items = (xml.match(/<item[ >]|<entry[ >]/g) ?? []).length
    return items > 0
      ? { naam, url, ok: true, items }
      : { naam, url, ok: false, reden: 'geen items in de feed' }
  } catch (err) {
    return { naam, url, ok: false, reden: err.name === 'TimeoutError' ? 'timeout' : err.message }
  }
}

const resultaten = await Promise.all(bronnen.map(check))
const kapot = resultaten.filter(r => !r.ok)

for (const r of resultaten.filter(r => r.ok).sort((a, b) => a.naam.localeCompare(b.naam))) {
  console.log(`  ok    ${String(r.items).padStart(4)} items  ${r.naam}`)
}
for (const r of kapot) {
  console.log(`  KAPOT  ${r.reden.padEnd(14)} ${r.naam} — ${r.url}`)
}

console.log(`\n${resultaten.length - kapot.length}/${resultaten.length} feeds werken.`)

if (kapot.length > 0) {
  console.error(`\n${kapot.length} feed(s) kapot. Vervang ze of haal ze uit lib/sources.ts.`)
  process.exit(1)
}
