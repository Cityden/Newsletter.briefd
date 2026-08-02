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

// EU_BASIS is universeel (land='alle'); NL_BASIS bevat daarnaast Rechtspraak.nl,
// dat ALLEEN voor 'nl' geldt. Alleen het verschil (NL_BASIS min EU_BASIS) krijgt
// dus de land-tag 'nl' — anders staat Rechtspraak.nl dubbel: eenmaal terecht
// onder 'nl', eenmaal ten onrechte onder 'alle'.
const euBasisNamen = (bron.match(/const EU_BASIS: BronEntry\[\] = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)
const nlBasisRegel = bron.match(/const NL_BASIS: BronEntry\[\] = \[([^\]]+)\]/)?.[1] ?? ''
const nlAlleenNamen = nlBasisRegel
  .split(',').map(s => s.trim()).filter(Boolean)
  .filter(n => n !== '...EU_BASIS')

if (euBasisNamen.length === 0 || nlAlleenNamen.length === 0) {
  console.error('Kon EU_BASIS/NL_BASIS niet parsen uit lib/sources.ts — is de structuur gewijzigd?')
  process.exit(1)
}

const matrix = bron.match(/const BRONNEN_PER_LAND[\s\S]*?\n\}\n/)[0]

const rijen = []
for (const landBlok of matrix.matchAll(/^  ([a-z_]+): \{([\s\S]*?)^  \},/gm)) {
  const land = landBlok[1]
  for (const cel of landBlok[2].matchAll(/^\s*([a-z]+):\s*met(?:NL)?\(([^)]*)\)/gm)) {
    const categorie = cel[1]
    for (const naam of cel[2].split(',').map(s => s.trim()).filter(Boolean)) {
      const c = constanten[naam]
      if (!c) { console.error(`Onbekende constante: ${naam}`); process.exit(1) }
      rijen.push({ ...c, land, categorie, is_basis: false })
    }
  }
}

// Universele basisset (EUR-Lex): één rij, land='alle', geldt voor elk land.
for (const naam of euBasisNamen) {
  const c = constanten[naam]
  if (!c) { console.error(`Onbekende basisbron: ${naam}`); process.exit(1) }
  rijen.push({ ...c, land: 'alle', categorie: 'basis', is_basis: true })
}
// Nederland-specifieke basis (Rechtspraak.nl): land='nl', niet 'alle'.
for (const naam of nlAlleenNamen) {
  const c = constanten[naam]
  if (!c) { console.error(`Onbekende NL-basisbron: ${naam}`); process.exit(1) }
  rijen.push({ ...c, land: 'nl', categorie: 'basis', is_basis: true })
}

const uniek = new Map()
for (const r of rijen) uniek.set(`${r.url}|${r.land}|${r.categorie}`, r)
const teSchrijven = [...uniek.values()].map(r => ({ ...r, herkomst: 'catalogus' }))

console.log(`${teSchrijven.length} rijen uit de catalogus`)
console.log(`  basisset:      ${teSchrijven.filter(r => r.is_basis).length}`)
console.log(`  specialisten:  ${teSchrijven.filter(r => !r.is_basis).length}`)
console.log(`  unieke feeds:  ${new Set(teSchrijven.map(r => r.url)).size}`)

// Het script hierboven is puur additief: een upsert op (url, land, categorie)
// voegt nieuwe combinaties toe en werkt bestaande bij, maar verwijdert nooit een
// rij die niet meer in de code-catalogus voorkomt. Verving je een bron in een
// categorie, dan bleef de oude stilletjes meetellen — precies zo kreeg
// internationaal/it zowel de nieuwe UK_NCSC als de oude, Nederlandstalige
// NCSC-feed. Reconciliatie: per (land, categorie) alles verwijderen dat niet in
// de nieuwe specialistenlijst zit. Basisrijen (is_basis=true) blijven hierbuiten.
async function reconciliarSpecialisten() {
  const verwacht = new Map() // "land|categorie" -> Set van urls
  for (const r of rijen.filter(r => !r.is_basis)) {
    const sleutel = `${r.land}|${r.categorie}`
    if (!verwacht.has(sleutel)) verwacht.set(sleutel, new Set())
    verwacht.get(sleutel).add(r.url)
  }

  const res = await fetch(
    `${URL_BASE}/rest/v1/bronnen?select=id,naam,url,land,categorie&is_basis=eq.false`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  )
  if (!res.ok) return
  const bestaand = await res.json()

  const teVerwijderen = bestaand.filter(r => {
    const sleutel = `${r.land}|${r.categorie}`
    // Alleen opruimen binnen (land, categorie)-paren die de catalogus vandaag
    // kent — een paar dat helemaal niet meer bestaat, laten we met rust (kan een
    // handmatige toevoeging zijn buiten de catalogus om).
    return verwacht.has(sleutel) && !verwacht.get(sleutel).has(r.url)
  })
  if (teVerwijderen.length === 0) return

  console.log(`\n${teVerwijderen.length} verouderde specialist-rij(en), niet meer in de catalogus voor hun (land, categorie):`)
  for (const r of teVerwijderen) console.log(`  ${r.land}/${r.categorie}: ${r.naam}`)

  if (!DOE_HET_ECHT) return
  for (const r of teVerwijderen) {
    await fetch(`${URL_BASE}/rest/v1/bronnen?id=eq.${r.id}`, {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
  }
  console.log(`${teVerwijderen.length} verouderde specialist-rij(en) verwijderd.`)
}

// Migratie 2 augustus 2026: Rechtspraak.nl stond eerder onder land='alle' (de
// oude, ongesplitste BASIS). Een upsert op (url, land, categorie) voegt de nieuwe
// rij (land='nl') toe zonder de foute oude rij (land='alle') te verwijderen —
// die blijft anders als duplicaat staan en bronnenUitDatabase's `.in('land', [land,
// 'alle'])` zou hem dan nog steeds aan elke abonnee toevoegen. Expliciet opruimen.
async function ruimVeroudBasisOp() {
  const universeel = new Set(rijen.filter(r => r.is_basis && r.land === 'alle').map(r => r.naam))
  const res = await fetch(
    `${URL_BASE}/rest/v1/bronnen?select=id,naam&is_basis=eq.true&land=eq.alle`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  )
  if (!res.ok) return
  const bestaand = await res.json()
  const teVerwijderen = bestaand.filter(r => !universeel.has(r.naam))
  if (teVerwijderen.length === 0) return

  console.log(`\n${teVerwijderen.length} verouderde basisrij(en) onder land='alle' die nu land-specifiek horen:`)
  for (const r of teVerwijderen) console.log(`  ${r.naam}`)

  if (!DOE_HET_ECHT) return
  for (const r of teVerwijderen) {
    await fetch(`${URL_BASE}/rest/v1/bronnen?id=eq.${r.id}`, {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
  }
  console.log(`${teVerwijderen.length} verouderde rij(en) verwijderd.`)
}
await ruimVeroudBasisOp()
await reconciliarSpecialisten()

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
