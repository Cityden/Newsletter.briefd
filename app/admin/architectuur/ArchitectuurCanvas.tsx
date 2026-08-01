'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BRONNEN,
  DOMEINEN,
  SOORT_LABEL,
  SOORT_VORM,
  type AgentNode,
  type Bron,
  type BronId,
  type Domein,
  type Onderdeel,
  type StatusMap,
} from '@/lib/architectuur'

// Interactieve architectuurkaart, radiaal zoals skilltree.altari.ai.
//
// Opbouw van binnen naar buiten:
//   kern      — de gedeelde bronnen waar alle agents hun informatie vandaan
//               halen (RSS, Anthropic, Supabase), plus agent_runs als logboek
//   ankers    — één per domein
//   agents    — de agents uit lib/agents/
//   onderdelen— wat die agent concreet aanraakt (bestand, model, route, …)
//
// Structuur komt uit lib/architectuur.ts, live status uit
// /api/admin/architectuur.

const c = {
  bg: '#0a0a0a',
  surface: '#101010',
  surfaceAlt: '#151515',
  border: '#212121',
  borderSoft: '#191919',
  tekst: '#eceae6',
  tekstZacht: '#9b9b95',
  tekstFlets: '#63635e',
  accent: '#4ade80',
  waarschuwing: '#facc15',
  fout: '#f87171',
}

const BRON_KLEUR: Record<BronId, string> = {
  rss: '#c084fc',
  anthropic: '#f0f0ee',
  supabase: '#34d399',
}

// De viewBox is breder dan hoog. De domeinlabels links en rechts zijn brede
// horizontale tekst en liepen bij een vierkante viewBox het beeld uit; verticaal
// is juist de hoogte de krappe kant. Vandaar 1240x1000 met het midden op 620.
const VB_B = 1240
const VB_H = 1000
const CX = VB_B / 2
const CY = VB_H / 2
const R_BRON = 86
const R_KERN_RAND = 128
const R_ANKER = 178
const R_AGENT = 300
const R_ONDERDEEL = 388
const ONDERDEEL_STAGGER = 34

const DOMEIN_SPREIDING = 68
const ONDERDEEL_SPREIDING = 14

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function waaier(n: number, i: number, spreiding: number) {
  if (n <= 1) return 0
  return -spreiding / 2 + (spreiding / (n - 1)) * i
}

function statusKleur(s: string | null | undefined, domeinKleur: string) {
  if (s === 'mislukt') return c.fout
  if (s === 'geëscaleerd') return c.waarschuwing
  return domeinKleur
}

function geleden(iso: string | null) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.round(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.round(uur / 24)
  if (dag < 31) return `${dag} dag${dag === 1 ? '' : 'en'} geleden`
  return `${Math.round(dag / 30)} maanden geleden`
}

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

interface GelegdeOnderdeel { onderdeel: Onderdeel; pos: { x: number; y: number }; sleutel: string }
interface GelegdeAgent { agent: AgentNode; domein: Domein; pos: { x: number; y: number }; onderdelen: GelegdeOnderdeel[] }
interface GelegdDomein { domein: Domein; anker: { x: number; y: number }; labelPos: { x: number; y: number }; agents: GelegdeAgent[] }

type Selectie = { soort: 'agent'; id: string } | { soort: 'bron'; id: BronId } | null

export default function ArchitectuurCanvas() {
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [laadFout, setLaadFout] = useState<string | null>(null)
  const [selectie, setSelectie] = useState<Selectie>(null)
  const [gekozenDomein, setGekozenDomein] = useState<string | null>(null)
  const [hoverAgent, setHoverAgent] = useState<string | null>(null)
  const [hoverDomein, setHoverDomein] = useState<string | null>(null)
  const [zoek, setZoek] = useState('')
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const svgRef = useRef<SVGSVGElement | null>(null)
  const animRef = useRef<number | null>(null)
  const sleep = useRef<{ x: number; y: number; vx: number; vy: number; bewogen: boolean } | null>(null)
  const [sleept, setSleept] = useState(false)

  useEffect(() => {
    let afgebroken = false
    fetch('/api/admin/architectuur')
      .then(r => r.json())
      .then(d => {
        if (afgebroken) return
        if (d.error) setLaadFout(d.error)
        setStatusMap(d.agents ?? {})
      })
      .catch(() => !afgebroken && setLaadFout('Live status niet op te halen'))
    return () => { afgebroken = true }
  }, [])

  const bronPos = useMemo(() => {
    const m = {} as Record<BronId, { x: number; y: number }>
    for (const b of BRONNEN) m[b.id] = polar(R_BRON, b.hoek)
    return m
  }, [])

  const layout = useMemo<GelegdDomein[]>(() => {
    return DOMEINEN.map(domein => {
      const anker = polar(R_ANKER, domein.hoek)
      const n = domein.agents.length
      const agents = domein.agents.map((agent, i) => {
        const hoek = domein.hoek + waaier(n, i, DOMEIN_SPREIDING)
        const pos = polar(R_AGENT, hoek)
        const m = agent.onderdelen.length
        const onderdelen = agent.onderdelen.map((onderdeel, j) => ({
          onderdeel,
          sleutel: `${agent.id}-${j}`,
          pos: polar(R_ONDERDEEL + (j % 2) * ONDERDEEL_STAGGER, hoek + waaier(m, j, ONDERDEEL_SPREIDING)),
        }))
        return { agent, domein, pos, onderdelen }
      })
      // Labels links en rechts moeten verder naar buiten dan die boven en onder:
      // horizontale tekst is breed en botste anders met de onderdelenring.
      // Boven/onder blijft op +78, want daar is de hoogte de beperking.
      const labelR = R_ONDERDEEL + 78 + 34 * Math.abs(Math.sin((domein.hoek * Math.PI) / 180))
      return { domein, anker, agents, labelPos: polar(labelR, domein.hoek) }
    })
  }, [])

  const alleAgents = useMemo(() => layout.flatMap(d => d.agents), [layout])

  // Focusset stuurt alle dimming aan. Volgorde: zoekterm, gekozen agent,
  // hover op agent, gekozen domein (blijft staan na klik), hover op domein.
  const focus = useMemo<Set<string> | null>(() => {
    const term = zoek.trim().toLowerCase()
    if (term) {
      return new Set(
        alleAgents
          .filter(({ agent }) =>
            agent.naam.toLowerCase().includes(term) ||
            agent.beschrijving.toLowerCase().includes(term) ||
            agent.onderdelen.some(o => o.label.toLowerCase().includes(term))
          )
          .map(t => t.agent.id)
      )
    }
    if (selectie?.soort === 'agent') return new Set([selectie.id])
    if (selectie?.soort === 'bron') {
      return new Set(alleAgents.filter(a => a.agent.bronnen.includes(selectie.id)).map(a => a.agent.id))
    }
    if (hoverAgent) return new Set([hoverAgent])
    const domeinId = hoverDomein ?? gekozenDomein
    if (domeinId) {
      const d = layout.find(l => l.domein.id === domeinId)
      return d ? new Set(d.agents.map(a => a.agent.id)) : null
    }
    return null
  }, [zoek, selectie, hoverAgent, hoverDomein, gekozenDomein, alleAgents, layout])

  const zoekTreffers = zoek.trim() ? (focus?.size ?? 0) : null
  const dim = useCallback((agentId: string) => (focus && !focus.has(agentId) ? 0.09 : 1), [focus])
  const toonOnderdelen = useCallback(
    (agentId: string) =>
      (selectie?.soort === 'agent' && selectie.id === agentId) ||
      hoverAgent === agentId ||
      (!!zoek.trim() && !!focus?.has(agentId)),
    [selectie, hoverAgent, zoek, focus]
  )

  // Bronnen die bij de huidige focus horen — die lichten in de kern op.
  const actieveBronnen = useMemo<Set<BronId>>(() => {
    if (selectie?.soort === 'bron') return new Set([selectie.id])
    if (!focus) return new Set()
    const s = new Set<BronId>()
    for (const a of alleAgents) if (focus.has(a.agent.id)) a.agent.bronnen.forEach(b => s.add(b))
    return s
  }, [focus, selectie, alleAgents])

  // ── Camera ──────────────────────────────────────────────────────────────
  const stopAnimatie = useCallback(() => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    animRef.current = null
  }, [])

  const animeerNaar = useCallback(
    (doel: { x: number; y: number; k: number }, ms = 520) => {
      stopAnimatie()
      const t0 = performance.now()
      let start: { x: number; y: number; k: number } | null = null
      const stap = (t: number) => {
        setView(v => {
          if (!start) start = v
          const p = Math.min(1, (t - t0) / ms)
          const e = easeInOutCubic(p)
          return {
            x: start.x + (doel.x - start.x) * e,
            y: start.y + (doel.y - start.y) * e,
            k: start.k + (doel.k - start.k) * e,
          }
        })
        if (t - t0 < ms) animRef.current = requestAnimationFrame(stap)
        else animRef.current = null
      }
      animRef.current = requestAnimationFrame(stap)
    },
    [stopAnimatie]
  )

  useEffect(() => stopAnimatie, [stopAnimatie])

  const fit = useCallback(() => {
    setGekozenDomein(null)
    animeerNaar({ x: 0, y: 0, k: 1 })
  }, [animeerNaar])

  // Zoomt zo in dat het zwaartepunt van een domein midden in beeld komt.
  const zoomNaarDomein = useCallback(
    (d: GelegdDomein) => {
      const punten = [
        d.anker,
        ...d.agents.map(a => a.pos),
        ...d.agents.flatMap(a => a.onderdelen.map(o => o.pos)),
        d.labelPos,
      ]
      const mx = punten.reduce((s, p) => s + p.x, 0) / punten.length
      const my = punten.reduce((s, p) => s + p.y, 0) / punten.length
      const k = 1.9
      // De <g> beeldt p af op k*p + (x,y); we willen (mx,my) op het midden.
      animeerNaar({ k, x: CX - k * mx, y: CY - k * my })
    },
    [animeerNaar]
  )

  const klikDomein = useCallback(
    (d: GelegdDomein) => {
      if (gekozenDomein === d.domein.id) {
        fit()
      } else {
        setGekozenDomein(d.domein.id)
        setSelectie(null)
        zoomNaarDomein(d)
      }
    },
    [gekozenDomein, fit, zoomNaarDomein]
  )

  // Clientcoördinaten → viewBox-eenheden. Zonder deze omrekening zoomt de kaart
  // weg onder de cursor, omdat de SVG geschaald in beeld staat.
  const naarViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(m.inverse())
  }, [])

  const opWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      const p = naarViewBox(e.clientX, e.clientY)
      if (!p) return
      stopAnimatie()
      setView(v => {
        const k = Math.min(5, Math.max(0.35, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        const s = k / v.k
        return { k, x: p.x - (p.x - v.x) * s, y: p.y - (p.y - v.y) * s }
      })
    },
    [naarViewBox, stopAnimatie]
  )

  const zoomKnop = useCallback(
    (factor: number) => {
      stopAnimatie()
      setView(v => {
        const k = Math.min(5, Math.max(0.35, v.k * factor))
        const s = k / v.k
        // Zoom rond het midden van de viewBox.
        return { k, x: CX - (CX - v.x) * s, y: CY - (CY - v.y) * s }
      })
    },
    [stopAnimatie]
  )

  const opMouseDown = useCallback(
    (e: React.MouseEvent) => {
      stopAnimatie()
      sleep.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, bewogen: false }
      setSleept(true)
    },
    [view.x, view.y, stopAnimatie]
  )

  useEffect(() => {
    if (!sleept) return
    const move = (e: MouseEvent) => {
      const s = sleep.current
      const m = svgRef.current?.getScreenCTM()
      if (!s || !m) return
      const dx = (e.clientX - s.x) / m.a
      const dy = (e.clientY - s.y) / m.d
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.bewogen = true
      setView(v => ({ ...v, x: s.vx + dx, y: s.vy + dy }))
    }
    const up = () => { sleep.current = null; setSleept(false) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [sleept])

  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSelectie(null)
      setZoek('')
      if (gekozenDomein) fit()
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [gekozenDomein, fit])

  const gekozenAgent = useMemo(
    () => (selectie?.soort === 'agent' ? alleAgents.find(a => a.agent.id === selectie.id) ?? null : null),
    [alleAgents, selectie]
  )
  const gekozenBron = useMemo<Bron | null>(
    () => (selectie?.soort === 'bron' ? BRONNEN.find(b => b.id === selectie.id) ?? null : null),
    [selectie]
  )

  const knopStijl: React.CSSProperties = {
    background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.tekstZacht,
    borderRadius: 8, width: 30, height: 28, cursor: 'pointer', fontSize: 14, lineHeight: 1,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: c.bg, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .node-raak { cursor: pointer; }
        .node-raak:hover circle, .node-raak:hover rect, .node-raak:hover polygon { filter: brightness(1.35); }
        .zoekveld::placeholder { color: ${c.tekstFlets}; }
        .zoekveld:focus { outline: none; border-color: ${c.border} !important; }
      `}</style>

      {/* ── Bovenbalk ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: `1px solid ${c.borderSoft}`, flexWrap: 'wrap' }}>
        <Link href="/admin" style={{ color: c.tekstZacht, textDecoration: 'none', fontSize: 12, whiteSpace: 'nowrap' }}>← Dashboard</Link>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: c.tekst }}>Agent-architectuur</span>

        <input
          className="zoekveld"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek agent, bestand, model, tabel…"
          style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '7px 11px', color: c.tekst, fontSize: 12, width: 230 }}
        />
        {zoekTreffers !== null && (
          <span style={{ fontSize: 11, color: zoekTreffers ? c.tekstZacht : c.fout }}>
            {zoekTreffers} {zoekTreffers === 1 ? 'agent' : 'agents'}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 11, color: c.tekstFlets, alignItems: 'center' }}>
          <span><span style={{ color: c.accent }}>●</span> gelukt</span>
          <span><span style={{ color: c.waarschuwing }}>●</span> geëscaleerd</span>
          <span><span style={{ color: c.fout }}>●</span> mislukt</span>
          <span><span style={{ color: '#3a3a3a' }}>○</span> gepland</span>
        </div>
      </div>

      {laadFout && (
        <div style={{ padding: '7px 18px', background: 'rgba(248,113,113,.08)', color: c.fout, fontSize: 11 }}>
          Live status niet geladen: {laadFout} — de structuur hieronder klopt nog wel.
        </div>
      )}

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_B} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          onWheel={opWheel}
          onMouseDown={opMouseDown}
          onClick={e => { if (e.target === svgRef.current && !sleep.current?.bewogen) setSelectie(null) }}
          style={{ width: '100%', height: '100%', display: 'block', cursor: sleept ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>

            {/* Bron-verbindingen: agent → kern. Gebundeld via het exacte midden,
                zodat zichtbaar wordt dat alles uit dezelfde kern komt. */}
            {alleAgents.map(({ agent, pos }) =>
              agent.bronnen.map(bronId => {
                const bp = bronPos[bronId]
                const aan = focus ? focus.has(agent.id) : false
                return (
                  <path
                    key={`${agent.id}-${bronId}`}
                    d={`M ${pos.x} ${pos.y} Q ${CX} ${CY} ${bp.x} ${bp.y}`}
                    fill="none"
                    stroke={BRON_KLEUR[bronId]}
                    strokeWidth={aan ? 1.6 : 0.7}
                    strokeOpacity={focus ? (aan ? 0.7 : 0.03) : 0.16}
                    style={{ transition: 'stroke-opacity .18s, stroke-width .18s' }}
                  />
                )
              })
            )}

            {/* Verbindingen anker → agent → onderdeel */}
            {layout.map(({ domein, anker, agents }) => (
              <g key={domein.id}>
                <line
                  x1={CX} y1={CY} x2={anker.x} y2={anker.y}
                  stroke={domein.kleur} strokeWidth={1.2}
                  strokeOpacity={focus ? 0.08 : 0.18}
                  strokeDasharray={domein.agents.every(a => a.status === 'gepland') ? '4 4' : undefined}
                />
                {agents.map(({ agent, pos, onderdelen }) => (
                  <g key={agent.id} opacity={dim(agent.id)} style={{ transition: 'opacity .18s' }}>
                    <line
                      x1={anker.x} y1={anker.y} x2={pos.x} y2={pos.y}
                      stroke={agent.status === 'actief' ? domein.kleur : '#333'}
                      strokeWidth={1.2} strokeOpacity={0.45}
                      strokeDasharray={agent.status === 'gepland' ? '3 3' : undefined}
                    />
                    {onderdelen.map(({ pos: op, sleutel }) => (
                      <line key={sleutel} x1={pos.x} y1={pos.y} x2={op.x} y2={op.y} stroke={domein.kleur} strokeWidth={0.8} strokeOpacity={0.24} />
                    ))}
                  </g>
                ))}
              </g>
            ))}

            {/* ── Kern: de gedeelde bronnen ── */}
            <circle cx={CX} cy={CY} r={R_KERN_RAND} fill="none" stroke={c.border} strokeWidth={1} strokeDasharray="3 5" opacity={0.7} />

            {BRONNEN.map(bron => {
              const p = bronPos[bron.id]
              const aan = actieveBronnen.size === 0 || actieveBronnen.has(bron.id)
              const kleur = BRON_KLEUR[bron.id]
              // Label naast de node in plaats van radiaal erboven: bij een
              // radiale offset van 30 liep de gecentreerde tekst dwars door de
              // node (straal 13) heen. Boven het midden erboven, links en rechts
              // ernaast met een passende uitlijning.
              const rechts = bron.hoek > 0 && bron.hoek < 180
              const verticaal = bron.hoek === 0 || bron.hoek === 180
              // -38 en niet -26: bij -26 kwam de detailregel (nog eens +13) precies
              // op de bovenrand van de node zelf te liggen.
              const labelP = verticaal
                ? { x: p.x, y: p.y - 38 }
                : { x: p.x + (rechts ? 22 : -22), y: p.y + 4 }
              const uitlijning = verticaal ? 'middle' : rechts ? 'start' : 'end'
              return (
                <g
                  key={bron.id}
                  className="node-raak"
                  opacity={aan ? 1 : 0.16}
                  onClick={e => { e.stopPropagation(); setSelectie(s => (s?.soort === 'bron' && s.id === bron.id ? null : { soort: 'bron', id: bron.id })) }}
                  style={{ transition: 'opacity .18s' }}
                >
                  <circle cx={p.x} cy={p.y} r={13} fill={c.bg} stroke={kleur} strokeWidth={1.8} />
                  <circle cx={p.x} cy={p.y} r={5} fill={kleur} />
                  <text x={labelP.x} y={labelP.y} textAnchor={uitlijning} fill={c.tekst} fontSize={11} fontFamily="'DM Sans', sans-serif" fontWeight={600}>
                    {bron.naam}
                  </text>
                  <text x={labelP.x} y={labelP.y + 13} textAnchor={uitlijning} fill={c.tekstFlets} fontSize={9} fontFamily="'DM Sans', sans-serif">
                    {bron.detail}
                  </text>
                </g>
              )
            })}

            {/* agent_runs: geen bron maar het logboek waar alles naartoe schrijft */}
            <circle cx={CX} cy={CY} r={9} fill={c.bg} stroke={c.tekstFlets} strokeWidth={1} />
            <text x={CX} y={CY + 3} textAnchor="middle" fill={c.tekstFlets} fontSize={7} fontFamily="'DM Sans', sans-serif">log</text>

            {/* Domeinlabels + ankers — klikken zoomt naar het cluster */}
            {layout.map(gd => {
              const { domein, anker, labelPos, agents } = gd
              const gedimd = focus && !agents.some(a => focus.has(a.agent.id))
              const isGekozen = gekozenDomein === domein.id
              return (
                <g
                  key={domein.id}
                  className="node-raak"
                  opacity={gedimd ? 0.1 : 1}
                  onMouseEnter={() => setHoverDomein(domein.id)}
                  onMouseLeave={() => setHoverDomein(null)}
                  onClick={e => { e.stopPropagation(); if (!sleep.current?.bewogen) klikDomein(gd) }}
                  style={{ transition: 'opacity .18s' }}
                >
                  <circle cx={anker.x} cy={anker.y} r={isGekozen ? 10 : 7} fill={c.bg} stroke={domein.kleur} strokeWidth={1.5} />
                  {/* Ruime, onzichtbare klikzone rond het label */}
                  <rect x={labelPos.x - 150} y={labelPos.y - 20} width={300} height={44} fill="transparent" />
                  <text
                    x={labelPos.x} y={labelPos.y} textAnchor="middle"
                    fill={domein.agents.some(a => a.status === 'actief') ? c.tekst : '#3a3a3a'}
                    fontSize={15} fontFamily="'DM Serif Display', serif" letterSpacing="2px"
                  >
                    {domein.naam}
                  </text>
                  <text x={labelPos.x} y={labelPos.y + 17} textAnchor="middle" fill={c.tekstFlets} fontSize={9} fontFamily="'DM Sans', sans-serif">
                    {isGekozen ? 'klik om uit te zoomen' : domein.ondertitel}
                  </text>
                </g>
              )
            })}

            {/* Onderdelen */}
            {layout.map(({ domein, agents }) =>
              agents.map(({ agent, onderdelen }) =>
                onderdelen.map(({ onderdeel, pos, sleutel }) => {
                  const vorm = SOORT_VORM[onderdeel.soort]
                  return (
                    <g key={sleutel} opacity={dim(agent.id)} style={{ transition: 'opacity .18s' }}>
                      {vorm === 'vierkant' && <rect x={pos.x - 3.4} y={pos.y - 3.4} width={6.8} height={6.8} fill={c.bg} stroke={domein.kleur} strokeWidth={1.2} />}
                      {vorm === 'ruit' && <rect x={pos.x - 3.4} y={pos.y - 3.4} width={6.8} height={6.8} fill={c.bg} stroke={domein.kleur} strokeWidth={1.2} transform={`rotate(45 ${pos.x} ${pos.y})`} />}
                      {vorm === 'driehoek' && <polygon points={`${pos.x},${pos.y - 4.4} ${pos.x + 4},${pos.y + 3} ${pos.x - 4},${pos.y + 3}`} fill={c.bg} stroke={domein.kleur} strokeWidth={1.2} />}
                      {vorm === 'cirkel' && <circle cx={pos.x} cy={pos.y} r={3.4} fill={c.bg} stroke={domein.kleur} strokeWidth={1.2} />}
                      {toonOnderdelen(agent.id) && (
                        <text x={pos.x} y={pos.y - 8} textAnchor="middle" fill={c.tekstZacht} fontSize={8} fontFamily="'DM Sans', sans-serif">
                          {onderdeel.label}
                        </text>
                      )}
                    </g>
                  )
                })
              )
            )}

            {/* Agents */}
            {layout.map(({ domein, agents }) =>
              agents.map(({ agent, pos }) => {
                const live = statusMap[agent.id]
                const isGekozen = selectie?.soort === 'agent' && selectie.id === agent.id
                const kleur = agent.status === 'gepland' ? '#333' : statusKleur(live?.laatsteStatus, domein.kleur)
                const r = isGekozen ? 10 : 7
                return (
                  <g
                    key={agent.id}
                    className="node-raak"
                    opacity={dim(agent.id)}
                    onMouseEnter={() => setHoverAgent(agent.id)}
                    onMouseLeave={() => setHoverAgent(null)}
                    onClick={e => {
                      e.stopPropagation()
                      if (sleep.current?.bewogen) return
                      setSelectie(s => (s?.soort === 'agent' && s.id === agent.id ? null : { soort: 'agent', id: agent.id }))
                    }}
                    style={{ transition: 'opacity .18s' }}
                  >
                    {live && live.mislukt7d > 0 && (
                      <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke={c.fout} strokeWidth={1} strokeOpacity={0.5} />
                    )}
                    <circle cx={pos.x} cy={pos.y} r={r} fill={agent.status === 'actief' ? kleur : c.bg} stroke={kleur} strokeWidth={1.5} opacity={agent.status === 'actief' ? 1 : 0.75} />
                    <text
                      x={pos.x} y={pos.y - r - 6} textAnchor="middle"
                      fill={isGekozen || hoverAgent === agent.id ? c.tekst : c.tekstZacht}
                      fontSize={11} fontFamily="'DM Sans', sans-serif" fontWeight={isGekozen ? 700 : 500}
                    >
                      {agent.naam}
                    </text>
                  </g>
                )
              })
            )}
          </g>
        </svg>

        {/* ── Zoomregelaars ── */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 6 }}>
          <button onClick={() => zoomKnop(1 / 1.2)} style={knopStijl} aria-label="Uitzoomen">−</button>
          <span style={{ fontSize: 11, color: c.tekstZacht, minWidth: 40, textAlign: 'center' }}>{Math.round(view.k * 100)}%</span>
          <button onClick={() => zoomKnop(1.2)} style={knopStijl} aria-label="Inzoomen">+</button>
          <button onClick={fit} style={{ ...knopStijl, width: 'auto', padding: '0 10px', fontSize: 11 }}>Fit</button>
        </div>

        {/* ── Detailpaneel ── */}
        {(gekozenAgent || gekozenBron) && (
          <div style={{ position: 'absolute', top: 16, right: 16, width: 300, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: '0 10px 30px rgba(0,0,0,.5)', maxHeight: 'calc(100% - 90px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: c.tekst, lineHeight: 1.2 }}>
                {gekozenAgent ? gekozenAgent.agent.naam : gekozenBron!.naam}
              </span>
              <button onClick={() => setSelectie(null)} style={{ background: 'transparent', border: 'none', color: c.tekstFlets, cursor: 'pointer', fontSize: 14, lineHeight: 1 }} aria-label="Sluiten">✕</button>
            </div>

            {gekozenBron && (
              <>
                <div style={{ fontSize: 10, color: c.tekstFlets, marginBottom: 10, letterSpacing: '.5px' }}>GEDEELDE BRON</div>
                <div style={{ fontSize: 11, color: BRON_KLEUR[gekozenBron.id], marginBottom: 10 }}>{gekozenBron.detail}</div>
                <p style={{ fontSize: 12, color: c.tekstZacht, lineHeight: 1.65, margin: '0 0 12px' }}>{gekozenBron.toelichting}</p>
                <div style={{ fontSize: 10, color: c.tekstFlets, letterSpacing: '1px', marginBottom: 8 }}>GEBRUIKT DOOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {alleAgents.filter(a => a.agent.bronnen.includes(gekozenBron.id)).map(a => (
                    <button
                      key={a.agent.id}
                      onClick={() => setSelectie({ soort: 'agent', id: a.agent.id })}
                      style={{ fontFamily: 'inherit', fontSize: 11, background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.tekstZacht, borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      {a.agent.naam}
                    </button>
                  ))}
                </div>
              </>
            )}

            {gekozenAgent && (() => {
              const live = statusMap[gekozenAgent.agent.id]
              const gepland = gekozenAgent.agent.status === 'gepland'
              const kleur = gepland ? c.tekstFlets : statusKleur(live?.laatsteStatus, c.accent)
              const label = gepland ? 'GEPLAND' : live?.laatsteStatus ? live.laatsteStatus.toUpperCase() : 'NOG NIET GEDRAAID'
              return (
                <>
                  <div style={{ fontSize: 10, color: c.tekstFlets, marginBottom: 10, letterSpacing: '.5px' }}>{gekozenAgent.domein.naam}</div>
                  <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, marginBottom: 12, background: gepland ? 'rgba(255,255,255,.05)' : `${kleur}1f`, color: kleur }}>
                    {label}
                  </div>
                  {live && (
                    <div style={{ fontSize: 11, color: c.tekstZacht, marginBottom: 12, lineHeight: 1.7 }}>
                      <div>Laatste run: {geleden(live.laatsteRun) ?? '—'}</div>
                      {live.duurMs != null && <div>Duur: {(live.duurMs / 1000).toFixed(1)}s</div>}
                      <div>
                        Laatste 7 dagen: {live.runs7d} run{live.runs7d === 1 ? '' : 's'}
                        {live.mislukt7d > 0 && <span style={{ color: c.fout }}> · {live.mislukt7d} misgegaan</span>}
                      </div>
                      {live.reden && <div style={{ color: c.fout, marginTop: 4 }}>Reden: {live.reden}</div>}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: c.tekstZacht, lineHeight: 1.65, margin: '0 0 10px' }}>{gekozenAgent.agent.beschrijving}</p>
                  <div style={{ fontSize: 11, color: c.tekstFlets, marginBottom: 14 }}>
                    <strong style={{ color: c.tekstZacht }}>Trigger:</strong> {gekozenAgent.agent.trigger}
                  </div>

                  {gekozenAgent.agent.bronnen.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: c.tekstFlets, letterSpacing: '1px', marginBottom: 8 }}>HAALT INFO UIT</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                        {gekozenAgent.agent.bronnen.map(b => {
                          const bron = BRONNEN.find(x => x.id === b)!
                          return (
                            <button
                              key={b}
                              onClick={() => setSelectie({ soort: 'bron', id: b })}
                              style={{ fontFamily: 'inherit', fontSize: 11, background: c.surfaceAlt, border: `1px solid ${BRON_KLEUR[b]}40`, color: BRON_KLEUR[b], borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                            >
                              {bron.naam}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {gekozenAgent.agent.onderdelen.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: c.tekstFlets, letterSpacing: '1px', marginBottom: 8 }}>RAAKT</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {gekozenAgent.agent.onderdelen.map((o, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11 }}>
                            <span style={{ color: c.tekstFlets, fontSize: 9, minWidth: 52, textTransform: 'uppercase', letterSpacing: '.5px' }}>{SOORT_LABEL[o.soort]}</span>
                            <code style={{ color: c.tekstZacht, background: c.surfaceAlt, padding: '1px 6px', borderRadius: 4 }}>{o.label}</code>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 18, left: 18, fontSize: 10, color: c.tekstFlets, lineHeight: 1.6 }}>
          Klik een domeinnaam om erheen te zoomen · klik een bron in het midden om te zien wie hem gebruikt<br />
          Sleep om te verschuiven · scroll om te zoomen · Esc zet alles terug
        </div>
      </div>
    </div>
  )
}
