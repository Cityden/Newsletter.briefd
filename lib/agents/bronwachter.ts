import { supabase } from '@/lib/supabase'
import { stuurAlertMail } from './alert'
import { logAgentRun, timer } from './logging'

// Bronwachter-agent.
//
// Aanleiding: in augustus 2026 bleek 76 van de 96 feeds in de catalogus dood.
// Dat viel nergens op, want fetchFeed logt een fout en gaat door — een abonnee
// met vijf dode bronnen kreeg gewoon een nieuwsbrief, alleen dan uit de enige
// feed die nog liep. Deze agent meet elke feed en zet een bron die het twee keer
// op rij laat afweten in quarantaine, zodat hij uit de rotatie verdwijnt.
//
// Bewust géén poging tot repareren of vervangen: dat is het werk van een
// verkenner-agent, met goedkeuring. Deze agent meet en meldt.

// Ruimer dan de 20s van fetchFeed, zodat een bron die in productie nog net
// binnenkomt hier niet ten onrechte als kapot geldt.
const TIMEOUT_MS = 25000
// Trager dan dit is nog niet kapot, maar wel een risico: fetchFeed breekt af op
// 20s. Zo zie je het aankomen voordat de bron stil uitvalt.
const TRAAG_MS = 10000
// Eén mislukking kan een hik zijn bij de bron. Pas bij de tweede op rij gaat hij
// eruit — anders verlies je een goede bron door een storing van vijf minuten.
const FOUTEN_VOOR_QUARANTAINE = 2

const UA = 'Brieft-Nieuwsbrief/1.0 (+https://brieft.online)'

interface BronRij {
  url: string
  naam: string
  status: string
  opeenvolgende_fouten: number
  is_basis: boolean
}

interface Meting {
  url: string
  naam: string
  ok: boolean
  items: number
  duurMs: number
  reden?: string
}

async function meet(url: string, naam: string): Promise<Meting> {
  const start = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const duurMs = Date.now() - start
    if (!res.ok) return { url, naam, ok: false, items: 0, duurMs, reden: `HTTP ${res.status}` }

    const xml = await res.text()
    const items = (xml.match(/<item[ >]|<entry[ >]/g) ?? []).length
    return items > 0
      ? { url, naam, ok: true, items, duurMs }
      : { url, naam, ok: false, items: 0, duurMs, reden: 'geen items in de feed' }
  } catch (err) {
    const duurMs = Date.now() - start
    const reden = err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : String(err)
    return { url, naam, ok: false, items: 0, duurMs, reden }
  }
}

export async function bronwachterAgent(): Promise<{
  gemeten: number
  kapot: number
  nieuwInQuarantaine: string[]
  hersteld: string[]
  traag: string[]
}> {
  const stop = timer()

  const { data: rijen, error } = await supabase
    .from('bronnen')
    .select('url, naam, status, opeenvolgende_fouten, is_basis')
    .in('status', ['actief', 'quarantaine'])

  if (error) {
    await logAgentRun({
      agent: 'bronwachter',
      inputRef: 'alle-bronnen',
      status: 'mislukt',
      reden: `bronnen ophalen mislukt: ${error.message}`,
      durationMs: stop(),
    })
    return { gemeten: 0, kapot: 0, nieuwInQuarantaine: [], hersteld: [], traag: [] }
  }

  // De tabel bevat één rij per (url, land, categorie); meet elke feed één keer.
  const perUrl = new Map<string, BronRij>()
  for (const r of (rijen ?? []) as BronRij[]) {
    const bestaand = perUrl.get(r.url)
    // Neem de hoogste foutenteller, zodat rijen niet uit de pas gaan lopen.
    if (!bestaand || r.opeenvolgende_fouten > bestaand.opeenvolgende_fouten) perUrl.set(r.url, r)
  }

  const metingen = await Promise.all([...perUrl.values()].map(r => meet(r.url, r.naam)))

  const nieuwInQuarantaine: string[] = []
  const hersteld: string[] = []
  const traag: string[] = []
  const nu = new Date().toISOString()

  for (const m of metingen) {
    const bron = perUrl.get(m.url)!
    if (m.ok && m.duurMs > TRAAG_MS) traag.push(`${m.naam} — ${(m.duurMs / 1000).toFixed(1)}s`)

    if (m.ok) {
      // Alleen automatisch herstellen wat de bronwachter zelf heeft weggezet: een
      // handmatige quarantaine heeft foutenteller 0 en blijft dus staan. Anders
      // draait deze agent elke nacht jouw eigen kwaliteitsoordeel terug.
      const magHerstellen = bron.status === 'quarantaine' && bron.opeenvolgende_fouten > 0
      if (magHerstellen) hersteld.push(m.naam)

      await supabase.from('bronnen').update({
        laatst_gecontroleerd_op: nu,
        laatst_gelukt_op: nu,
        laatste_aantal_artikelen: m.items,
        opeenvolgende_fouten: 0,
        ...(magHerstellen ? { status: 'actief' } : {}),
      }).eq('url', m.url)
      continue
    }

    const fouten = bron.opeenvolgende_fouten + 1
    const gaatInQuarantaine = fouten >= FOUTEN_VOOR_QUARANTAINE && bron.status === 'actief'
    if (gaatInQuarantaine) nieuwInQuarantaine.push(`${m.naam} — ${m.reden}`)

    await supabase.from('bronnen').update({
      laatst_gecontroleerd_op: nu,
      laatste_aantal_artikelen: 0,
      opeenvolgende_fouten: fouten,
      ...(gaatInQuarantaine ? { status: 'quarantaine' } : {}),
    }).eq('url', m.url)
  }

  const kapot = metingen.filter(m => !m.ok).length

  // Stil blijven als er niets aan de hand is — een dagelijkse mail die altijd
  // hetzelfde zegt, lees je na een week niet meer.
  if (nieuwInQuarantaine.length > 0 || hersteld.length > 0 || traag.length > 0) {
    const regels = [
      ...nieuwInQuarantaine.map(r => `<strong>In quarantaine:</strong> ${r}`),
      ...hersteld.map(r => `Weer actief: ${r}`),
      ...traag.map(r => `Traag (fetchFeed breekt af op 20s): ${r}`),
    ]
    if (nieuwInQuarantaine.length > 0) {
      regels.push(
        'Een bron in quarantaine telt niet meer mee bij het samenstellen van nieuwsbrieven. ' +
        'Zoek een vervanger of zet de status in Supabase terug op <code>actief</code>.'
      )
    }
    await stuurAlertMail(`Bronwachter: ${metingen.length - kapot}/${metingen.length} feeds werken`, regels)
  }

  await logAgentRun({
    agent: 'bronwachter',
    inputRef: 'alle-bronnen',
    status: nieuwInQuarantaine.length > 0 ? 'geëscaleerd' : 'gelukt',
    output: {
      gemeten: metingen.length,
      kapot,
      inQuarantaine: nieuwInQuarantaine.length,
      hersteld: hersteld.length,
      traag: traag.length,
    },
    reden: nieuwInQuarantaine.length > 0 ? nieuwInQuarantaine.join(' | ') : undefined,
    durationMs: stop(),
  })

  return { gemeten: metingen.length, kapot, nieuwInQuarantaine, hersteld, traag }
}
