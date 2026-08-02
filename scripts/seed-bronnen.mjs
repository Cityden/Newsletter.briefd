#!/usr/bin/env node
// Vult de tabel `bronnen` met de catalogus uit lib/sources.ts.
//
//   npm run seed:bronnen          # toont wat er zou gebeuren
//   npm run seed:bronnen -- --doe # schrijft echt weg
//
// Idempotent: draait op (url, land, categorie) en werkt bestaande rijen bij in
// plaats van te dupliceren. Bestaande status en notitie blijven staan, zodat een
// bron die jij in quarantaine hebt gezet niet vanzelf weer actief wordt.

import { readFileSync } from 'node:fs'

const DOE_HET_ECHT = process.argv.includes('--doe')

// .env.local inlezen zonder extra dependency
const env = {}
for (const regel of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = regel.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_KEY
if (!URL_BASE || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt in .env.local')
  process.exit(1)
}

// ── Catalogus uit lib/sources.ts parseren ────────────────────────────────
const bron = readFileSync(new URL('../lib/sources.ts', import.meta.url), 'utf8')

const constanten = {}
for (const m of bron.matchAll(/^const ([A-Z_0-9]+)\s*=\s*\{ naam: '([^']+)',\s*url: '([^']+)' \}/gm)) {
  constanten[m[1]] = { naam: m[2], url: m[3] }
}

const basisNamen = (bron.match(/const BASIS: BronEntry\[\] = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

const matrix = bron.match(/const BRONNEN_PER_LAND[\s\S]*?\n\}\n/)[0]

const rijen = []
for (const landBlok of matrix.matchAll(/^  ([a-z_]+): \{([\s\S]*?)^  \},/gm)) {
  const land = landBlok[1]
  for (const cel of landBlok[2].matchAll(/^\s*([a-z]+):\s*met\(([^)]*)\)/gm)) {
    const categorie = cel[1]
    for (const naam of cel[2].split(',').map(s => s.trim()).filter(Boolean)) {
      const c = constanten[naam]
      if (!c) { console.error(`Onbekende constante: ${naam}`); process.exit(1) }
      rijen.push({ ...c, land, categorie, is_basis: false })
    }
  }
}

// De basisset krijgt één rij per bron, los van land en categorie.
for (const naam of basisNamen) {
  const c = constanten[naam]
  if (!c) { console.error(`Onbekende basisbron: ${naam}`); process.exit(1) }
  rijen.push({ ...c, land: 'alle', categorie: 'basis', is_basis: true })
}

const uniek = new Map()
for (const r of rijen) uniek.set(`${r.url}|${r.land}|${r.categorie}`, r)
const teSchrijven = [...uniek.values()].map(r => ({ ...r, herkomst: 'catalogus' }))

console.log(`${teSchrijven.length} rijen uit de catalogus`)
console.log(`  basisset:      ${teSchrijven.filter(r => r.is_basis).length}`)
console.log(`  specialisten:  ${teSchrijven.filter(r => !r.is_basis).length}`)
console.log(`  unieke feeds:  ${new Set(teSchrijven.map(r => r.url)).size}`)

if (!DOE_HET_ECHT) {
  console.log('\nProefdraai — er is niets weggeschreven. Draai met --doe om het echt te doen.')
  process.exit(0)
}

const res = await fetch(`${URL_BASE}/rest/v1/bronnen?on_conflict=url,land,categorie`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    // merge-duplicates werkt bestaande rijen bij in plaats van te falen op de
    // unique-constraint; status en notitie staan niet in de payload en blijven dus staan.
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(teSchrijven),
})

if (!res.ok) {
  console.error(`Wegschrijven mislukt: HTTP ${res.status}`)
  console.error((await res.text()).slice(0, 500))
  process.exit(1)
}

console.log(`\n${(await res.json()).length} rijen weggeschreven.`)
