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

type SendStatus = 'idle' | 'laden' | 'succes' | 'geen-updates' | 'fout'

export default function AdminDashboard() {
  const router = useRouter()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [sendStatus, setSendStatus] = useState<Record<string, SendStatus>>({})
  const [sendDetail, setSendDetail] = useState<Record<string, string>>({})

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

  async function verstuurNieuwsbrief(email: string) {
    setSendStatus(s => ({ ...s, [email]: 'laden' }))
    setSendDetail(s => ({ ...s, [email]: '' }))

    const res = await fetch('/api/admin/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const body = await res.json()

    if (res.ok && body.ok) {
      setSendStatus(s => ({ ...s, [email]: 'succes' }))
      setSendDetail(s => ({ ...s, [email]: body.onderwerp }))
      setTimeout(() => {
        fetch('/api/admin/subscribers').then(r => r.json()).then(setSubscribers)
      }, 1000)
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

  const actief = subscribers.filter(s => s.actief)
  const inactief = subscribers.filter(s => !s.actief)

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

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Beheer</div>
            <div style={{ fontFamily: "'DM Serif Display'", fontSize: 28, fontWeight: 400, color: '#f0f0ee', letterSpacing: '-.3px' }}>Subscribers</div>
          </div>
          <button
            onClick={exporteerCSV}
            disabled={laden || subscribers.length === 0}
            style={{ fontSize: 12, fontWeight: 600, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: '#4ade80', border: '1px solid rgba(74,222,128,.25)', opacity: laden ? 0.4 : 1 }}
          >
            Exporteer CSV
          </button>
        </div>

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
                  {['Naam', 'E-mail', 'Vakgebied', 'Branche', 'Frequentie', 'Aangemeld', 'Laatste mail', 'Status', 'Actie'].map(kol => (
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
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDatum(sub.aangemeld_op)}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDatum(sub.laatste_mail_op)}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                        <span style={{
                          display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                          background: sub.actief ? 'rgba(74,222,128,.08)' : 'rgba(255,255,255,.03)',
                          border: sub.actief ? '1px solid rgba(74,222,128,.2)' : '1px solid #1e1e1e',
                          color: sub.actief ? '#4ade80' : '#333',
                        }}>
                          {sub.actief ? 'Actief' : 'Uitgeschreven'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #141414' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {sub.actief && (
                            <div>
                              <button
                                style={{
                                  fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
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
                    <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: 13 }}>
                      Nog geen subscribers aangemeld.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
