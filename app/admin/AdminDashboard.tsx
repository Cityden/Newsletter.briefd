'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BRANCHE_OPTIES = [
  'Horeca & Toerisme', 'Detailhandel & Retail', 'Financiële dienstverlening',
  'Gezondheidszorg & Welzijn', 'Bouw & Vastgoed', 'Industrie & Productie',
  'Transport & Logistiek', 'ICT & Tech', 'Onderwijs & Onderzoek',
  'Zakelijke dienstverlening', 'Overheid & Non-profit', 'Energie & Utilities',
  'Agri, Food & Farma', 'Media & Communicatie', 'Anders',
]

// Geschatte kosten per verstuurde nieuwsbrief (Claude Sonnet API + Resend)
// Claude Sonnet 4.6: ~4000 input tokens × $3/MTok + ~2000 output tokens × $15/MTok ≈ $0.042 ≈ €0.039
const KOSTEN_PER_MAIL_EUR = 0.04

// ── Designtokens ──────────────────────────────────────────────────────────
// Eén bron van waarheid voor kleur en ruimte. De oude waarden (#333 tekst op
// #111 achtergrond) haalden nergens leesbaar contrast; deze schaal wel.
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
  accentZacht: 'rgba(74,222,128,.1)',
  accentRand: 'rgba(74,222,128,.24)',
  waarschuwing: '#facc15',
  fout: '#f87171',
}

interface Subscriber {
  id: string
  naam: string
  email: string
  vakgebied: string
  branche: string | null
  organisatie: string
  frequentie: string
  actief: boolean
  aangemeld_op: string
  laatste_mail_op: string | null
}

interface LogRegel {
  id: string
  subscriber_id: string
  onderwerp: string
  status: string
  verstuurd_op: string
  subscribers: {
    naam: string
    email: string
    vakgebied: string
    frequentie: string
  } | null
}

type SendStatus = 'idle' | 'laden' | 'succes' | 'geen-updates' | 'fout'
// Architectuur is bewust geen tabblad meer maar een eigen pagina: de kaart
// heeft het volledige scherm nodig om leesbaar te blijven.
type Tabblad = 'subscribers' | 'statistieken' | 'agents'

interface AgentRun {
  id: string
  agent: string
  input_ref: string
  status: 'gelukt' | 'mislukt' | 'geëscaleerd'
  reden: string | null
  output: Record<string, unknown> | null
  duration_ms: number | null
  aangemaakt_op: string
}

interface Rectificatie {
  id: string
  titel: string
  bron_naam: string
  bron_url: string
  rectificatie_notitie: string | null
  laatst_gecontroleerd_op: string | null
}

interface ConceptRegel {
  batch_token: string
  status: string
  naam: string
  email: string
  onderwerp: string
  aangemaakt_op: string
  items_preview: { titel: string; impact: string; bronNaam: string }[] | null
}

interface AgentsData {
  recenteRuns: AgentRun[]
  rectificaties: Rectificatie[]
  concepten: ConceptRegel[]
  fouten?: string[]
}

const TAB_LABELS: Record<Tabblad, string> = {
  subscribers: 'Subscribers',
  statistieken: 'Statistieken',
  agents: 'Agents',
}

// ── Herbruikbare bouwstenen ───────────────────────────────────────────────

function Kaart({ titel, extra, actie, children, style }: {
  titel?: string
  extra?: React.ReactNode
  actie?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', ...style }}>
      {titel && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${c.borderSoft}` }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: c.tekst, margin: 0, letterSpacing: '-.01em' }}>{titel}</h2>
          {extra}
          <div style={{ marginLeft: 'auto' }}>{actie}</div>
        </header>
      )}
      {children}
    </section>
  )
}

function StatKaart({ waarde, label, klein }: { waarde: React.ReactNode; label: string; klein?: boolean }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{
        fontFamily: klein ? "'DM Sans', sans-serif" : "'DM Serif Display', serif",
        fontSize: klein ? 22 : 30, fontWeight: klein ? 700 : 400,
        color: c.accent, lineHeight: 1.1, marginBottom: 6, letterSpacing: '-.02em',
      }}>
        {waarde}
      </div>
      <div style={{ fontSize: 11, color: c.tekstZacht, fontWeight: 500, letterSpacing: '.01em' }}>{label}</div>
    </div>
  )
}

function Badge({ kleur, achtergrond, rand, children }: {
  kleur: string; achtergrond: string; rand: string; children: React.ReactNode
}) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
      background: achtergrond, border: `1px solid ${rand}`, color: kleur, whiteSpace: 'nowrap',
      letterSpacing: '.02em',
    }}>
      {children}
    </span>
  )
}

function FrequentieBadge({ frequentie }: { frequentie: string }) {
  const wekelijks = frequentie === 'wekelijks'
  return (
    <Badge
      kleur={wekelijks ? c.accent : c.tekstZacht}
      achtergrond={wekelijks ? c.accentZacht : 'rgba(255,255,255,.04)'}
      rand={wekelijks ? c.accentRand : c.border}
    >
      {frequentie}
    </Badge>
  )
}

function Kop({ kolommen }: { kolommen: string[] }) {
  return (
    <thead>
      <tr>
        {kolommen.map(kol => (
          <th key={kol} style={{
            textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: c.tekstFlets,
            textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: `1px solid ${c.borderSoft}`,
            whiteSpace: 'nowrap', background: c.surfaceAlt,
          }}>
            {kol}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Leeg({ kolommen, children }: { kolommen: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={kolommen} style={{ padding: '48px 16px', textAlign: 'center', color: c.tekstFlets, fontSize: 13 }}>
        {children}
      </td>
    </tr>
  )
}

function Foutbalk({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: c.fout, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>{titel}</div>
      <div style={{ fontSize: 12.5, color: c.tekstZacht, lineHeight: 1.6, wordBreak: 'break-word' }}>{children}</div>
    </div>
  )
}

const cel: React.CSSProperties = {
  padding: '12px 16px', borderBottom: `1px solid ${c.borderSoft}`, color: c.tekstZacht, verticalAlign: 'middle',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tabblad, setTabblad] = useState<Tabblad>('subscribers')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [logRegels, setLogRegels] = useState<LogRegel[]>([])
  const [laden, setLaden] = useState(true)
  const [statsLaden, setStatsLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [statsFout, setStatsFout] = useState('')
  const [agentsFout, setAgentsFout] = useState('')
  const [zoek, setZoek] = useState('')
  const [sendStatus, setSendStatus] = useState<Record<string, SendStatus>>({})
  const [sendDetail, setSendDetail] = useState<Record<string, string>>({})
  const [sendBestemming, setSendBestemming] = useState<Record<string, 'admin' | 'subscriber' | 'beide'>>({})
  const [agentsData, setAgentsData] = useState<AgentsData | null>(null)
  const [agentsLaden, setAgentsLaden] = useState(false)

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then(r => {
        if (r.status === 401) { router.push('/admin/login'); return null }
        return r.json()
      })
      .then(data => {
        if (data) setSubscribers(data)
        setLaden(false)
      })
      .catch(() => { setFout('Laden mislukt'); setLaden(false) })
  }, [router])

  useEffect(() => {
    if (tabblad !== 'agents' || agentsData) return
    setAgentsLaden(true)
    setAgentsFout('')
    fetch('/api/admin/agents')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
        return data as AgentsData
      })
      .then(data => {
        setAgentsData(data)
        if (data.fouten?.length) setAgentsFout(data.fouten.join(' · '))
        setAgentsLaden(false)
      })
      .catch(e => { setAgentsFout(e.message ?? 'Laden mislukt'); setAgentsLaden(false) })
  }, [tabblad, agentsData])

  useEffect(() => {
    if (tabblad !== 'statistieken' || logRegels.length > 0) return
    setStatsLaden(true)
    setStatsFout('')
    fetch('/api/admin/stats')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
        return data
      })
      .then(data => { setLogRegels(Array.isArray(data) ? data : []); setStatsLaden(false) })
      .catch(e => { setStatsFout(e.message ?? 'Laden mislukt'); setStatsLaden(false) })
  }, [tabblad, logRegels.length])

  async function verstuurNieuwsbrief(email: string) {
    setSendStatus(s => ({ ...s, [email]: 'laden' }))
    setSendDetail(s => ({ ...s, [email]: '' }))
    const bestemming = sendBestemming[email] ?? 'admin'

    const res = await fetch('/api/admin/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, bestemming }),
    })
    const body = await res.json()

    if (res.ok && body.ok) {
      setSendStatus(s => ({ ...s, [email]: 'succes' }))
      setSendDetail(s => ({ ...s, [email]: body.onderwerp }))
      setTimeout(() => {
        fetch('/api/admin/subscribers').then(r => r.json()).then(setSubscribers)
      }, 1000)
      // Reset log zodat die bij terugkeer opnieuw wordt geladen
      setLogRegels([])
    } else if (res.ok && !body.ok) {
      setSendStatus(s => ({ ...s, [email]: 'geen-updates' }))
      setSendDetail(s => ({ ...s, [email]: body.reden }))
    } else {
      setSendStatus(s => ({ ...s, [email]: 'fout' }))
      setSendDetail(s => ({ ...s, [email]: body.error ?? 'Onbekende fout' }))
    }
  }

  async function updateBranche(id: string, branche: string) {
    await fetch('/api/admin/subscribers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, branche: branche || null }),
    })
    setSubscribers(s => s.map(sub => sub.id === id ? { ...sub, branche: branche || null } : sub))
  }

  async function verwijderSubscriber(id: string, naam: string) {
    if (!confirm(`Weet je zeker dat je ${naam} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    const res = await fetch('/api/admin/subscribers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setSubscribers(s => s.filter(sub => sub.id !== id))
  }

  function exporteerCSV() {
    const kolommen = ['Naam', 'E-mail', 'Vakgebied', 'Branche', 'Organisatie', 'Frequentie', 'Status', 'Aangemeld op', 'Laatste mail']
    const rijen = subscribers.map(s => [
      s.naam,
      s.email,
      s.vakgebied,
      s.branche ?? '',
      s.organisatie,
      s.frequentie,
      s.actief ? 'Actief' : 'Uitgeschreven',
      s.aangemeld_op ? new Date(s.aangemeld_op).toLocaleDateString('nl-NL') : '',
      s.laatste_mail_op ? new Date(s.laatste_mail_op).toLocaleDateString('nl-NL') : '',
    ])

    const csvInhoud = [kolommen, ...rijen]
      .map(r => r.map(cel => `"${String(cel).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvInhoud], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brieft-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uitloggen() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  function formatDatum(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function eersteMandag(jaar: number, maand: number): Date {
    const d = new Date(jaar, maand, 1)
    const dag = d.getDay()
    const offset = dag === 1 ? 0 : (8 - dag) % 7
    d.setDate(1 + offset)
    return d
  }

  function volgendeMailDatum(sub: Subscriber): Date | null {
    if (!sub.actief) return null
    const nu = new Date()

    if (sub.frequentie === 'wekelijks') {
      const dag = nu.getDay()
      const daysUntilMonday = (1 - dag + 7) % 7 || 7
      const volgende = new Date(nu)
      volgende.setDate(nu.getDate() + daysUntilMonday)
      return volgende
    }

    if (sub.frequentie === 'maandelijks') {
      const dezeMaand = eersteMandag(nu.getFullYear(), nu.getMonth())
      if (dezeMaand > nu) return dezeMaand
      let jaar = nu.getFullYear()
      let maand = nu.getMonth() + 1
      if (maand > 11) { maand = 0; jaar++ }
      return eersteMandag(jaar, maand)
    }

    return null
  }

  function formatBedrag(eur: number) {
    return `\u20AC\u00A0${eur.toFixed(2)}`
  }

  const actief = subscribers.filter(s => s.actief)
  const inactief = subscribers.filter(s => !s.actief)

  const zichtbareSubscribers = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    if (!q) return subscribers
    return subscribers.filter(s =>
      [s.naam, s.email, s.vakgebied, s.branche ?? '', s.organisatie]
        .some(v => v.toLowerCase().includes(q))
    )
  }, [subscribers, zoek])

  // Stats berekeningen
  const totaalMails = logRegels.length
  const totaleKosten = totaalMails * KOSTEN_PER_MAIL_EUR

  const perSubscriber = logRegels.reduce<Record<string, { naam: string; email: string; vakgebied: string; frequentie: string; aantal: number }>>((acc, log) => {
    const id = log.subscriber_id
    if (!acc[id]) {
      acc[id] = {
        naam: log.subscribers?.naam ?? '(verwijderd)',
        email: log.subscribers?.email ?? '—',
        vakgebied: log.subscribers?.vakgebied ?? '—',
        frequentie: log.subscribers?.frequentie ?? '—',
        aantal: 0,
      }
    }
    acc[id].aantal++
    return acc
  }, {})

  const subscriberStats = Object.values(perSubscriber).sort((a, b) => b.aantal - a.aantal)

  return (
    <div style={{ minHeight: '100vh', background: c.bg, padding: '0 0 80px', fontFamily: "'DM Sans', sans-serif", color: c.tekst }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        select option { background: #151515; color: ${c.tekst}; }
        .tabel-rij { transition: background .12s; }
        .tabel-rij:hover { background: #131313; }
        .knop-zacht { transition: border-color .15s, color .15s, background .15s; }
        .knop-zacht:hover { border-color: #333 !important; color: ${c.tekst} !important; }
        .knop-accent { transition: background .15s, opacity .15s; }
        .knop-accent:hover:not(:disabled) { background: #86efac !important; }
        .knop-gevaar:hover { border-color: rgba(248,113,113,.35) !important; color: ${c.fout} !important; }
        .tab:hover { color: ${c.tekst} !important; }
        .veld:focus { outline: none; border-color: #2f2f2f !important; }
        .zoekveld::placeholder { color: ${c.tekstFlets}; }
        a.bron:hover { text-decoration: underline; }
        @media (max-width: 860px) {
          .schil { padding: 0 1.1rem !important; }
          .kop-rij { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tabs { overflow-x: auto !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${c.borderSoft}`, padding: '0 2rem' }}>
        <div className="schil" style={{ maxWidth: 1240, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 19, color: c.tekst, letterSpacing: '-.2px' }}>◈ Brieft</span>
            <span style={{ fontSize: 11, color: c.tekstFlets, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>Admin</span>
          </div>
          <button
            className="knop-zacht"
            style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: c.tekstZacht, fontFamily: 'inherit' }}
            onClick={uitloggen}
          >
            Uitloggen
          </button>
        </div>
      </nav>

      <div className="schil" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 2rem' }}>

        {/* Titel + tabs */}
        <div style={{ padding: '36px 0 20px' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, fontWeight: 400, color: c.tekst, margin: '0 0 20px', letterSpacing: '-.5px' }}>
            Dashboard
          </h1>
          <div className="tabs" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${c.borderSoft}` }}>
            {(Object.keys(TAB_LABELS) as Tabblad[]).map(t => {
              const aan = tabblad === t
              return (
                <button
                  key={t}
                  className="tab"
                  onClick={() => setTabblad(t)}
                  style={{
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '-.01em',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '10px 14px', marginBottom: -1, whiteSpace: 'nowrap',
                    color: aan ? c.tekst : c.tekstFlets,
                    borderBottom: `2px solid ${aan ? c.accent : 'transparent'}`,
                    transition: 'color .15s, border-color .15s',
                  }}
                >
                  {TAB_LABELS[t]}
                </button>
              )
            })}
            <Link
              className="tab"
              href="/admin/architectuur"
              style={{
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '-.01em',
                textDecoration: 'none', padding: '10px 14px', marginBottom: -1, whiteSpace: 'nowrap',
                color: c.tekstFlets, borderBottom: '2px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'color .15s',
              }}
            >
              Architectuur <span style={{ fontSize: 10, opacity: .7 }}>↗</span>
            </Link>
          </div>
        </div>

        {/* ── SUBSCRIBERS TAB ── */}
        {tabblad === 'subscribers' && (
          <>
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { getal: subscribers.length, tekst: 'Totaal aangemeld' },
                { getal: actief.length, tekst: 'Actief' },
                { getal: inactief.length, tekst: 'Uitgeschreven' },
                { getal: actief.filter(s => s.frequentie === 'wekelijks').length, tekst: 'Wekelijks' },
                { getal: actief.filter(s => s.frequentie === 'maandelijks').length, tekst: 'Maandelijks' },
              ].map(({ getal, tekst }) => (
                <StatKaart key={tekst} waarde={laden ? '—' : getal} label={tekst} />
              ))}
            </div>

            <Kaart
              titel="Alle subscribers"
              extra={
                <>
                  {laden && <span style={{ fontSize: 12, color: c.tekstFlets }}>Laden…</span>}
                  {fout && <span style={{ fontSize: 12, color: c.fout }}>{fout}</span>}
                  {!laden && !fout && (
                    <span style={{ fontSize: 12, color: c.tekstFlets }}>
                      {zichtbareSubscribers.length}{zoek ? ` van ${subscribers.length}` : ''}
                    </span>
                  )}
                </>
              }
              actie={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="veld zoekveld"
                    value={zoek}
                    onChange={e => setZoek(e.target.value)}
                    placeholder="Zoeken…"
                    style={{ fontFamily: 'inherit', fontSize: 12, padding: '7px 11px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.tekst, width: 150 }}
                  />
                  <button
                    className="knop-zacht"
                    onClick={exporteerCSV}
                    disabled={laden || subscribers.length === 0}
                    style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: c.accent, border: `1px solid ${c.accentRand}`, opacity: laden || subscribers.length === 0 ? 0.4 : 1, whiteSpace: 'nowrap' }}
                  >
                    Exporteer CSV
                  </button>
                </div>
              }
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <Kop kolommen={['Subscriber', 'Vakgebied', 'Branche', 'Ritme', 'Datums', 'Testverzending', '']} />
                  <tbody>
                    {zichtbareSubscribers.map(sub => {
                      const status = sendStatus[sub.email] ?? 'idle'
                      const bestemming = sendBestemming[sub.email] ?? 'admin'
                      const volgende = sub.actief ? volgendeMailDatum(sub) : null
                      return (
                        <tr key={sub.id} className="tabel-rij" style={{ opacity: sub.actief ? 1 : 0.45 }}>
                          {/* Naam + e-mail samen — scheelt een kolom en leest als één identiteit */}
                          <td style={{ ...cel, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: sub.actief ? c.accent : c.tekstFlets }} />
                              <div>
                                <div style={{ color: c.tekst, fontWeight: 600 }}>{sub.naam}</div>
                                <div style={{ color: c.tekstFlets, fontSize: 11.5, marginTop: 1 }}>{sub.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...cel, maxWidth: 150 }}>{sub.vakgebied}</td>
                          <td style={{ ...cel, padding: '8px 16px', minWidth: 170 }}>
                            <select
                              className="veld"
                              value={sub.branche ?? ''}
                              onChange={e => updateBranche(sub.id, e.target.value)}
                              style={{ fontSize: 12, padding: '6px 8px', borderRadius: 7, border: `1px solid ${c.border}`, background: c.bg, color: sub.branche ? c.tekstZacht : c.tekstFlets, fontFamily: 'inherit', cursor: 'pointer', width: '100%' }}
                            >
                              <option value="">— Geen branche —</option>
                              {BRANCHE_OPTIES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </td>
                          <td style={cel}><FrequentieBadge frequentie={sub.frequentie} /></td>
                          <td style={{ ...cel, whiteSpace: 'nowrap', fontSize: 11.5, lineHeight: 1.7 }}>
                            <div style={{ color: c.tekstFlets }}>↗ aangemeld {formatDatum(sub.aangemeld_op)}</div>
                            <div style={{ color: sub.laatste_mail_op ? c.tekstZacht : c.tekstFlets }}>✉ laatste {formatDatum(sub.laatste_mail_op)}</div>
                            {volgende && <div style={{ color: c.accent }}>→ volgende {formatDatum(volgende.toISOString())}</div>}
                          </td>
                          {/* Testverzending: bestemming + knop naast elkaar in plaats van
                              een gestapeld mini-formulier per rij */}
                          <td style={{ ...cel, minWidth: 230 }}>
                            {sub.actief ? (
                              <>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select
                                    className="veld"
                                    value={bestemming}
                                    onChange={e => setSendBestemming(s => ({ ...s, [sub.email]: e.target.value as 'admin' | 'subscriber' | 'beide' }))}
                                    style={{ fontSize: 12, padding: '6px 8px', borderRadius: 7, border: `1px solid ${c.border}`, background: c.bg, color: c.tekstZacht, fontFamily: 'inherit', cursor: 'pointer' }}
                                  >
                                    <option value="admin">Naar mijzelf</option>
                                    <option value="subscriber">Naar abonnee</option>
                                    <option value="beide">Naar beiden</option>
                                  </select>
                                  <button
                                    className="knop-accent"
                                    style={{
                                      fontSize: 11.5, fontWeight: 700, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
                                      opacity: status === 'laden' ? 0.5 : 1,
                                      background: status === 'succes' ? c.accentZacht : status === 'fout' ? 'rgba(248,113,113,.1)' : status === 'geen-updates' ? c.surfaceAlt : c.accent,
                                      color: status === 'succes' ? c.accent : status === 'fout' ? c.fout : status === 'geen-updates' ? c.tekstZacht : c.bg,
                                      border: `1px solid ${status === 'succes' ? c.accentRand : status === 'fout' ? 'rgba(248,113,113,.25)' : status === 'geen-updates' ? c.border : 'transparent'}`,
                                    }}
                                    onClick={() => verstuurNieuwsbrief(sub.email)}
                                    disabled={status === 'laden'}
                                  >
                                    {status === 'laden' ? 'Bezig…'
                                      : status === 'succes' ? '✓ Verstuurd'
                                      : status === 'geen-updates' ? '— Geen updates'
                                      : status === 'fout' ? '✗ Fout'
                                      : 'Verstuur'}
                                  </button>
                                </div>
                                {sendDetail[sub.email] && (
                                  <div style={{ fontSize: 11, color: status === 'fout' ? c.fout : c.tekstFlets, marginTop: 6, maxWidth: 230, lineHeight: 1.5 }}>
                                    {sendDetail[sub.email]}
                                  </div>
                                )}
                              </>
                            ) : (
                              <Badge kleur={c.tekstZacht} achtergrond="rgba(255,255,255,.04)" rand={c.border}>uitgeschreven</Badge>
                            )}
                          </td>
                          <td style={{ ...cel, textAlign: 'right' }}>
                            <button
                              className="knop-zacht knop-gevaar"
                              title={`${sub.naam} verwijderen`}
                              style={{ fontSize: 13, lineHeight: 1, padding: '6px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: c.tekstFlets, border: `1px solid ${c.border}` }}
                              onClick={() => verwijderSubscriber(sub.id, sub.naam)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {!laden && subscribers.length === 0 && (
                      <Leeg kolommen={7}>Nog geen subscribers aangemeld.</Leeg>
                    )}
                    {!laden && subscribers.length > 0 && zichtbareSubscribers.length === 0 && (
                      <Leeg kolommen={7}>Geen resultaten voor “{zoek}”.</Leeg>
                    )}
                  </tbody>
                </table>
              </div>
            </Kaart>
          </>
        )}

        {/* ── STATISTIEKEN TAB ── */}
        {tabblad === 'statistieken' && (
          <>
            {statsFout && <Foutbalk titel="Statistieken laden mislukt">{statsFout}</Foutbalk>}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { getal: statsLaden ? '—' : totaalMails.toString(), tekst: 'Totaal verstuurde mails' },
                { getal: statsLaden ? '—' : subscriberStats.length.toString(), tekst: 'Unieke ontvangers' },
                { getal: statsLaden ? '—' : formatBedrag(totaleKosten), tekst: 'Geschatte totale kosten*', klein: true },
              ].map(({ getal, tekst, klein }) => (
                <StatKaart key={tekst} waarde={getal} label={tekst} klein={klein} />
              ))}
            </div>

            <Kaart
              titel="Mails per persoon"
              extra={statsLaden ? <span style={{ fontSize: 12, color: c.tekstFlets }}>Laden…</span> : null}
              style={{ marginBottom: 16 }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <Kop kolommen={['Naam', 'E-mail', 'Vakgebied', 'Frequentie', 'Mails verstuurd', 'Geschatte kosten*']} />
                  <tbody>
                    {subscriberStats.map((s, i) => (
                      <tr key={i} className="tabel-rij">
                        <td style={{ ...cel, color: c.tekst, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.naam}</td>
                        <td style={{ ...cel, color: c.tekstFlets, fontSize: 12 }}>{s.email}</td>
                        <td style={cel}>{s.vakgebied}</td>
                        <td style={cel}><FrequentieBadge frequentie={s.frequentie} /></td>
                        <td style={cel}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: c.tekst, minWidth: 22 }}>{s.aantal}</span>
                            <div style={{ flex: 1, maxWidth: 90, height: 4, borderRadius: 2, background: c.surfaceAlt, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, background: c.accent, width: `${Math.min(100, (s.aantal / (subscriberStats[0]?.aantal || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ ...cel, fontWeight: 600 }}>{formatBedrag(s.aantal * KOSTEN_PER_MAIL_EUR)}</td>
                      </tr>
                    ))}
                    {subscriberStats.length > 0 && (
                      <tr style={{ background: c.surfaceAlt }}>
                        <td colSpan={4} style={{ padding: '12px 16px', color: c.tekstZacht, fontSize: 12, fontWeight: 600 }}>Totaal</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: c.accent }}>{totaalMails}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: c.accent, fontWeight: 700, fontSize: 13 }}>{formatBedrag(totaleKosten)}</td>
                      </tr>
                    )}
                    {!statsLaden && subscriberStats.length === 0 && (
                      <Leeg kolommen={6}>Nog geen mails verstuurd.</Leeg>
                    )}
                  </tbody>
                </table>
              </div>
            </Kaart>

            <Kaart titel="Recente verzendingen" style={{ marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <Kop kolommen={['Datum', 'Naam', 'Onderwerp', 'Status']} />
                  <tbody>
                    {logRegels.slice(0, 50).map(log => (
                      <tr key={log.id} className="tabel-rij">
                        <td style={{ ...cel, padding: '10px 16px', color: c.tekstFlets, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatDatum(log.verstuurd_op)}
                        </td>
                        <td style={{ ...cel, padding: '10px 16px', color: c.tekst, whiteSpace: 'nowrap' }}>
                          {log.subscribers?.naam ?? '(verwijderd)'}
                        </td>
                        <td style={{ ...cel, padding: '10px 16px', maxWidth: 460 }}>{log.onderwerp}</td>
                        <td style={{ ...cel, padding: '10px 16px' }}>
                          <Badge kleur={c.accent} achtergrond={c.accentZacht} rand={c.accentRand}>{log.status}</Badge>
                        </td>
                      </tr>
                    ))}
                    {!statsLaden && logRegels.length === 0 && (
                      <Leeg kolommen={4}>Nog geen verzendingen gelogd.</Leeg>
                    )}
                  </tbody>
                </table>
              </div>
            </Kaart>

            <p style={{ fontSize: 11, color: c.tekstFlets, lineHeight: 1.7, margin: 0, maxWidth: 720 }}>
              * Schatting op basis van Claude Sonnet 4.6 (~4.000 input + ~2.000 output tokens per nieuwsbrief = ≈ €0,04/mail).
              Werkelijke kosten kunnen afwijken. Raadpleeg de Anthropic- en Resend-dashboards voor exacte cijfers.
            </p>
          </>
        )}

        {/* ── AGENTS TAB ── */}
        {tabblad === 'agents' && (
          <>
            {agentsLaden && <p style={{ color: c.tekstZacht, fontSize: 13 }}>Laden…</p>}
            {agentsFout && (
              <Foutbalk titel="Agent-gegevens onvolledig">
                {agentsFout}
                <div style={{ marginTop: 8, color: c.tekstFlets }}>
                  Zolang dit speelt blijven de onderstaande overzichten leeg, ook als de pipeline wél draait.
                </div>
              </Foutbalk>
            )}
            {agentsData && (() => {
              const runs = agentsData.recenteRuns
              const alleAgenten = ['scout', 'classificatie', 'redactie', 'kwaliteitscontrole', 'personalisatie', 'watchdog', 'bronwachter', 'herziening', 'groeirapport', 'onboarding']
              const statusKleur = (s: string) => s === 'gelukt' ? c.accent : s === 'geëscaleerd' ? c.waarschuwing : c.fout
              const statusBg = (s: string) => s === 'gelukt' ? c.accentZacht : s === 'geëscaleerd' ? 'rgba(250,204,21,.1)' : 'rgba(248,113,113,.1)'
              const statusBorder = (s: string) => s === 'gelukt' ? c.accentRand : s === 'geëscaleerd' ? 'rgba(250,204,21,.24)' : 'rgba(248,113,113,.24)'

              // Groepeer concepten per batch_token (neem eerste per token)
              const batchMap = new Map<string, ConceptRegel[]>()
              for (const cr of agentsData.concepten) {
                if (!batchMap.has(cr.batch_token)) batchMap.set(cr.batch_token, [])
                batchMap.get(cr.batch_token)!.push(cr)
              }
              const batches = Array.from(batchMap.entries()).slice(0, 3)

              const issues = runs.filter(r => r.status !== 'gelukt')
              const aantalRectificaties = agentsData.rectificaties.length
              const pendingConcepten = agentsData.concepten.filter(cr => cr.status === 'in_afwachting')

              const gelukt = runs.filter(r => r.status === 'gelukt').length
              const gezondheid = runs.length ? Math.round((gelukt / runs.length) * 100) : null

              return (
                <>
                  {/* Overzicht in één oogopslag */}
                  <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatKaart waarde={runs.length} label="Runs (7 dagen)" />
                    <StatKaart waarde={gezondheid === null ? '—' : `${gezondheid}%`} label="Geslaagd" />
                    <StatKaart waarde={pendingConcepten.length} label="Wacht op goedkeuring" />
                    <StatKaart waarde={issues.length} label="Aandachtspunten" />
                  </div>

                  {/* Aandacht-nodig sectie */}
                  {(issues.length > 0 || aantalRectificaties > 0 || pendingConcepten.length > 0) && (
                    <div style={{ background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 12, padding: '18px 22px', marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: c.fout, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Aandacht nodig</div>
                      {pendingConcepten.length > 0 && (
                        <div style={{ fontSize: 13, color: c.waarschuwing, marginBottom: 8, lineHeight: 1.6 }}>
                          ⏳ <strong>{pendingConcepten.length} concept{pendingConcepten.length !== 1 ? 'en' : ''}</strong> wacht{pendingConcepten.length === 1 ? '' : 'en'} op goedkeuring — check je mail voor de goedkeurlink.
                        </div>
                      )}
                      {aantalRectificaties > 0 && (
                        <div style={{ fontSize: 13, color: c.fout, marginBottom: 8, lineHeight: 1.6 }}>
                          ⚠ <strong>{aantalRectificaties} item{aantalRectificaties !== 1 ? 's' : ''}</strong> mogelijk verouderd — de herzieningsagent heeft een bronwijziging gedetecteerd.
                        </div>
                      )}
                      {issues.slice(0, 5).map(r => (
                        <div key={r.id} style={{ fontSize: 12, color: c.tekstZacht, marginTop: 6, lineHeight: 1.6 }}>
                          <code style={{ color: c.fout, background: 'rgba(248,113,113,.12)', padding: '1px 5px', borderRadius: 3 }}>{r.agent}</code>
                          {' — '}{r.status}{r.reden ? ` — ${r.reden}` : ''}{' '}
                          <span style={{ color: c.tekstFlets }}>({formatDatum(r.aangemaakt_op)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rectificaties */}
                  {aantalRectificaties > 0 && (
                    <Kaart titel="Bronwijzigingen — rectificatie nodig" style={{ marginBottom: 16 }}>
                      {agentsData.rectificaties.map(r => (
                        <div key={r.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${c.borderSoft}` }}>
                          <div style={{ fontSize: 13, color: c.tekst, fontWeight: 600, marginBottom: 4 }}>{r.titel}</div>
                          <div style={{ fontSize: 12, color: c.tekstZacht, marginBottom: 6, lineHeight: 1.6 }}>{r.bron_naam} — {r.rectificatie_notitie}</div>
                          <a className="bron" href={r.bron_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: c.accent, textDecoration: 'none' }}>Bekijk bron →</a>
                        </div>
                      ))}
                    </Kaart>
                  )}

                  {/* Concepten (laatste batches) */}
                  {batches.length > 0 && (
                    <Kaart titel="Concepten" style={{ marginBottom: 16 }}>
                      {batches.map(([token, rijen]) => {
                        const eerste = rijen[0]
                        const statusLabel = eerste.status === 'goedgekeurd' ? 'Goedgekeurd' : eerste.status === 'verzonden' ? 'Verstuurd' : 'Wacht op goedkeuring'
                        const sKleur = eerste.status === 'verzonden' ? c.accent : eerste.status === 'goedgekeurd' ? c.waarschuwing : c.tekstZacht
                        return (
                          <div key={token} style={{ padding: '14px 20px', borderBottom: `1px solid ${c.borderSoft}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: c.tekstFlets }}>{formatDatum(eerste.aangemaakt_op)}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sKleur, textTransform: 'uppercase', letterSpacing: '.06em' }}>{statusLabel}</span>
                            </div>
                            {rijen.map(r => (
                              <div key={r.email} style={{ fontSize: 12, color: c.tekstZacht, marginBottom: 4, lineHeight: 1.5 }}>
                                <span style={{ color: c.tekst, fontWeight: 600 }}>{r.naam}</span> — {r.onderwerp}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </Kaart>
                  )}

                  {/* Pipeline gezondheid per agent */}
                  <Kaart titel="Pipeline — afgelopen 7 dagen" style={{ marginBottom: 16 }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <Kop kolommen={['Agent', 'Laatste run', 'Status', 'Runs', 'Fouten']} />
                        <tbody>
                          {alleAgenten.map(agent => {
                            const agentRuns = runs.filter(r => r.agent === agent)
                            const laatste = agentRuns[0]
                            const aantalFouten = agentRuns.filter(r => r.status === 'mislukt').length
                            return (
                              <tr key={agent} className="tabel-rij">
                                <td style={{ ...cel, padding: '10px 16px', color: c.tekst, fontWeight: 600 }}>
                                  <code style={{ fontSize: 12 }}>{agent}</code>
                                </td>
                                <td style={{ ...cel, padding: '10px 16px', color: c.tekstFlets, fontSize: 12 }}>
                                  {laatste ? formatDatum(laatste.aangemaakt_op) : '—'}
                                </td>
                                <td style={{ ...cel, padding: '10px 16px' }}>
                                  {laatste ? (
                                    <Badge kleur={statusKleur(laatste.status)} achtergrond={statusBg(laatste.status)} rand={statusBorder(laatste.status)}>
                                      {laatste.status}
                                    </Badge>
                                  ) : <span style={{ color: c.tekstFlets, fontSize: 12 }}>nog niet gedraaid</span>}
                                </td>
                                <td style={{ ...cel, padding: '10px 16px', color: agentRuns.length > 0 ? c.tekstZacht : c.tekstFlets }}>
                                  {agentRuns.length || '—'}
                                </td>
                                <td style={{ ...cel, padding: '10px 16px', color: aantalFouten > 0 ? c.fout : c.tekstFlets }}>
                                  {aantalFouten > 0 ? aantalFouten : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Kaart>

                  {/* Recente runs */}
                  <Kaart titel="Recente runs">
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <Kop kolommen={['Tijd', 'Agent', 'Ref', 'Status', 'Duur', 'Output/reden']} />
                        <tbody>
                          {runs.slice(0, 40).map(r => (
                            <tr key={r.id} className="tabel-rij">
                              <td style={{ ...cel, padding: '9px 16px', color: c.tekstFlets, whiteSpace: 'nowrap', fontSize: 11 }}>
                                {new Date(r.aangemaakt_op).toLocaleString('nl-NL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ ...cel, padding: '9px 16px' }}>
                                <code style={{ color: c.tekst, fontSize: 11 }}>{r.agent}</code>
                              </td>
                              <td style={{ ...cel, padding: '9px 16px', color: c.tekstFlets, fontSize: 11, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.input_ref}
                              </td>
                              <td style={{ ...cel, padding: '9px 16px' }}>
                                <Badge kleur={statusKleur(r.status)} achtergrond={statusBg(r.status)} rand={statusBorder(r.status)}>{r.status}</Badge>
                              </td>
                              <td style={{ ...cel, padding: '9px 16px', color: c.tekstFlets, fontSize: 11, whiteSpace: 'nowrap' }}>
                                {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                              <td style={{ ...cel, padding: '9px 16px', color: r.reden ? c.fout : c.tekstFlets, fontSize: 11, maxWidth: 280 }}>
                                {r.reden ?? (r.output ? JSON.stringify(r.output).slice(0, 80) : '—')}
                              </td>
                            </tr>
                          ))}
                          {runs.length === 0 && !agentsLaden && (
                            <Leeg kolommen={6}>Nog geen agent-runs — is de pipeline al live?</Leeg>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Kaart>
                </>
              )
            })()}
          </>
        )}

      </div>
    </div>
  )
}
