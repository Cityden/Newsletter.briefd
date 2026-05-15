'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  created_at: string
  subscribers: {
    naam: string
    email: string
    vakgebied: string
    frequentie: string
  } | null
}

type SendStatus = 'idle' | 'laden' | 'succes' | 'geen-updates' | 'fout'
type Tabblad = 'subscribers' | 'statistieken'

export default function AdminDashboard() {
  const router = useRouter()
  const [tabblad, setTabblad] = useState<Tabblad>('subscribers')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [logRegels, setLogRegels] = useState<LogRegel[]>([])
  const [laden, setLaden] = useState(true)
  const [statsLaden, setStatsLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [sendStatus, setSendStatus] = useState<Record<string, SendStatus>>({})
  const [sendDetail, setSendDetail] = useState<Record<string, string>>({})
  const [sendBestemming, setSendBestemming] = useState<Record<string, 'admin' | 'subscriber' | 'beide'>>({})

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
    if (tabblad !== 'statistieken' || logRegels.length > 0) return
    setStatsLaden(true)
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setLogRegels(Array.isArray(data) ? data : []); setStatsLaden(false) })
      .catch(() => setStatsLaden(false))
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

  function formatBedrag(eur: number) {
    return `€\u00A0${eur.toFixed(2)}`
  }

  const actief = subscribers.filter(s => s.actief)
  const inactief = subscribers.filter(s => !s.actief)

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 0 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        select option { background: #1a1a1a; color: #e8e8e6; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a1a1a', padding: '0 2rem', marginBottom: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 18, color: '#e8e8e6', letterSpacing: '-.2px' }}>◈ Brieft</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>Admin dashboard</span>
            <button
              style={{ background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#555', fontFamily: 'inherit' }}
              onClick={uitloggen}
            >
              Uitloggen
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>

        {/* Header + tabs */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Beheer</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['subscribers', 'statistieken'] as Tabblad[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTabblad(t)}
                  style={{
                    fontFamily: "'DM Serif Display'", fontSize: 24, fontWeight: 400, letterSpacing: '-.3px',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 12px 0 0',
                    color: tabblad === t ? '#f0f0ee' : '#2a2a2a',
                    transition: 'color .15s',
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {tabblad === 'subscribers' && (
            <button
              onClick={exporteerCSV}
              disabled={laden || subscribers.length === 0}
              style={{ fontSize: 12, fontWeight: 600, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: '#4ade80', border: '1px solid rgba(74,222,128,.25)', opacity: laden ? 0.4 : 1 }}
            >
              Exporteer CSV
            </button>
          )}
        </div>

        {/* ── SUBSCRIBERS TAB ── */}
        {tabblad === 'subscribers' && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 32 }}>
              {[
                { getal: subscribers.length, tekst: 'Totaal aangemeld' },
                { getal: actief.length, tekst: 'Actief' },
                { getal: inactief.length, tekst: 'Uitgeschreven' },
                { getal: actief.filter(s => s.frequentie === 'wekelijks').length, tekst: 'Wekelijks' },
                { getal: actief.filter(s => s.frequentie === 'maandelijks').length, tekst: 'Maandelijks' },
              ].map(({ getal, tekst }) => (
                <div key={tekst} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontFamily: "'DM Serif Display'", fontSize: 28, color: '#4ade80', lineHeight: 1, marginBottom: 6 }}>{laden ? '—' : getal}</div>
                  <div style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>{tekst}</div>
                </div>
              ))}
            </div>

            {/* Tabel */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d6', margin: 0 }}>Alle subscribers</h2>
                {laden && <span style={{ fontSize: 12, color: '#333' }}>Laden…</span>}
                {fout && <span style={{ fontSize: 12, color: '#f87171' }}>{fout}</span>}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Naam', 'E-mail', 'Vakgebied', 'Branche', 'Frequentie', 'Datums', 'Actie'].map(kol => (
                        <th key={kol} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' }}>
                          {kol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map(sub => {
                      const status = sendStatus[sub.email] ?? 'idle'
                      return (
                        <tr key={sub.id} style={{ opacity: sub.actief ? 1 : 0.4 }}>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#d8d8d6', fontWeight: 600, whiteSpace: 'nowrap' }}>{sub.naam}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#444', fontSize: 12 }}>{sub.email}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#888', maxWidth: 140 }}>{sub.vakgebied}</td>
                          <td style={{ padding: '8px 16px', borderBottom: '1px solid #141414', minWidth: 180 }}>
                            <select
                              value={sub.branche ?? ''}
                              onChange={e => updateBranche(sub.id, e.target.value)}
                              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #1e1e1e', background: '#0e0e0e', color: sub.branche ? '#888' : '#333', fontFamily: 'inherit', cursor: 'pointer', width: '100%' }}
                            >
                              <option value="">— Geen branche —</option>
                              {BRANCHE_OPTIES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                            <span style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                              background: sub.frequentie === 'wekelijks' ? 'rgba(74,222,128,.08)' : 'rgba(255,255,255,.04)',
                              border: sub.frequentie === 'wekelijks' ? '1px solid rgba(74,222,128,.2)' : '1px solid #222',
                              color: sub.frequentie === 'wekelijks' ? '#4ade80' : '#555',
                            }}>
                              {sub.frequentie}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #141414', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 11, color: '#444' }}>↗ {formatDatum(sub.aangemeld_op)}</div>
                            <div style={{ fontSize: 11, color: sub.laatste_mail_op ? '#4ade80' : '#2a2a2a', marginTop: 3 }}>✉ {formatDatum(sub.laatste_mail_op)}</div>
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {sub.actief && (
                                <div>
                                  {/* Bestemming toggle */}
                                  <div style={{ display: 'flex', marginBottom: 10, background: '#141414', borderRadius: 8, padding: 4, border: '1px solid #222' }}>
                                    {(['admin', 'subscriber', 'beide'] as const).map(opt => {
                                      const labels = { admin: 'Ikzelf', subscriber: 'Abonnee', beide: 'Beide' }
                                      const actief = (sendBestemming[sub.email] ?? 'admin') === opt
                                      return (
                                        <button
                                          key={opt}
                                          onClick={() => setSendBestemming(s => ({ ...s, [sub.email]: opt }))}
                                          style={{ flex: 1, fontSize: 11, fontWeight: 600, padding: '7px 4px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: actief ? '#4ade80' : 'transparent', color: actief ? '#0a0a0a' : '#555' }}
                                        >
                                          {labels[opt]}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  <button
                                    style={{
                                      fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', width: '100%',
                                      opacity: status === 'laden' ? 0.5 : 1,
                                      background: status === 'succes' ? 'rgba(74,222,128,.1)' : status === 'fout' ? 'rgba(248,113,113,.1)' : status === 'geen-updates' ? '#181818' : '#4ade80',
                                      color: status === 'succes' ? '#4ade80' : status === 'fout' ? '#f87171' : status === 'geen-updates' ? '#444' : '#0a0a0a',
                                      border: status === 'succes' ? '1px solid rgba(74,222,128,.2)' : status === 'fout' ? '1px solid rgba(248,113,113,.2)' : status === 'geen-updates' ? '1px solid #222' : '1px solid transparent',
                                    } as React.CSSProperties}
                                    onClick={() => verstuurNieuwsbrief(sub.email)}
                                    disabled={status === 'laden'}
                                  >
                                    {status === 'laden' ? 'Bezig…'
                                      : status === 'succes' ? '✓ Verstuurd'
                                      : status === 'geen-updates' ? '— Geen updates'
                                      : status === 'fout' ? '✗ Fout'
                                      : 'Verstuur'}
                                  </button>
                                  {sendDetail[sub.email] && (
                                    <div style={{ fontSize: 11, color: status === 'fout' ? '#f87171' : '#333', marginTop: 4, maxWidth: 160 }}>
                                      {sendDetail[sub.email]}
                                    </div>
                                  )}
                                </div>
                              )}
                              <button
                                style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', background: 'transparent', color: '#333', border: '1px solid #1e1e1e' }}
                                onClick={() => verwijderSubscriber(sub.id, sub.naam)}
                              >
                                Verwijder
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {!laden && subscribers.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: 13 }}>
                          Nog geen subscribers aangemeld.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── STATISTIEKEN TAB ── */}
        {tabblad === 'statistieken' && (
          <>
            {/* Totaal-overzicht */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
              {[
                { getal: statsLaden ? '—' : totaalMails.toString(), tekst: 'Totaal verstuurde mails' },
                { getal: statsLaden ? '—' : subscriberStats.length.toString(), tekst: 'Unieke ontvangers' },
                { getal: statsLaden ? '—' : formatBedrag(totaleKosten), tekst: 'Geschatte totale kosten*', klein: true },
              ].map(({ getal, tekst, klein }) => (
                <div key={tekst} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontFamily: klein ? "'DM Sans'" : "'DM Serif Display'", fontSize: klein ? 22 : 28, fontWeight: klein ? 700 : 400, color: '#4ade80', lineHeight: 1, marginBottom: 6 }}>{getal}</div>
                  <div style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>{tekst}</div>
                </div>
              ))}
            </div>

            {/* Per-subscriber tabel */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, marginBottom: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d6', margin: 0 }}>Mails per persoon</h2>
                {statsLaden && <span style={{ fontSize: 12, color: '#333' }}>Laden…</span>}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Naam', 'E-mail', 'Vakgebied', 'Frequentie', 'Mails verstuurd', 'Geschatte kosten*'].map(kol => (
                        <th key={kol} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' }}>
                          {kol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriberStats.map((s, i) => (
                      <tr key={i}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#d8d8d6', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.naam}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#444', fontSize: 12 }}>{s.email}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#888' }}>{s.vakgebied}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                          <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: s.frequentie === 'wekelijks' ? 'rgba(74,222,128,.08)' : 'rgba(255,255,255,.04)',
                            border: s.frequentie === 'wekelijks' ? '1px solid rgba(74,222,128,.2)' : '1px solid #222',
                            color: s.frequentie === 'wekelijks' ? '#4ade80' : '#555',
                          }}>
                            {s.frequentie}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: "'DM Serif Display'", fontSize: 20, color: '#f0f0ee' }}>{s.aantal}</span>
                            <div style={{ flex: 1, maxWidth: 80, height: 4, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, background: '#4ade80', width: `${Math.min(100, (s.aantal / (subscriberStats[0]?.aantal || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#888', fontWeight: 600, fontSize: 13 }}>
                          {formatBedrag(s.aantal * KOSTEN_PER_MAIL_EUR)}
                        </td>
                      </tr>
                    ))}
                    {/* Totaalrij */}
                    {subscriberStats.length > 0 && (
                      <tr style={{ background: '#0e0e0e' }}>
                        <td colSpan={4} style={{ padding: '12px 16px', color: '#555', fontSize: 12, fontWeight: 600 }}>Totaal</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 20, color: '#4ade80' }}>{totaalMails}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4ade80', fontWeight: 700, fontSize: 13 }}>
                          {formatBedrag(totaleKosten)}
                        </td>
                      </tr>
                    )}
                    {!statsLaden && subscriberStats.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: 13 }}>
                          Nog geen mails verstuurd.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recente log */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, marginBottom: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d6', margin: 0 }}>Recente verzendingen</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Datum', 'Naam', 'Onderwerp', 'Status'].map(kol => (
                        <th key={kol} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' }}>
                          {kol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logRegels.slice(0, 50).map(log => (
                      <tr key={log.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #141414', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatDatum(log.created_at)}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #141414', color: '#888', whiteSpace: 'nowrap' }}>
                          {log.subscribers?.naam ?? '(verwijderd)'}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #141414', color: '#555', maxWidth: 400 }}>
                          {log.onderwerp}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #141414' }}>
                          <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#4ade80',
                          }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: 11, color: '#2a2a2a', lineHeight: 1.6, margin: 0 }}>
              * Schatting op basis van Claude Sonnet 4.6 (~4.000 input + ~2.000 output tokens per nieuwsbrief = ≈ €0,04/mail).
              Werkelijke kosten kunnen afwijken. Raadpleeg de Anthropic- en Resend-dashboards voor exacte cijfers.
            </p>
          </>
        )}

      </div>
    </div>
  )
}
