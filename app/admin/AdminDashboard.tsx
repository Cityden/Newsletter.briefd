'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Subscriber {
  id: string
  naam: string
  email: string
  vakgebied: string
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
      // Refresh lijst voor bijgewerkte laatste_mail_op
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
    <div style={s.pagina}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.label}>Regelgeving nieuwsbrief</div>
          <h1 style={s.h1}>Admin dashboard</h1>
        </div>
        <button style={s.uitlogBtn} onClick={uitloggen}>Uitloggen</button>
      </div>

      {/* Stats */}
      <div style={s.statsRij}>
        {[
          { getal: subscribers.length, tekst: 'Totaal aangemeld' },
          { getal: actief.length, tekst: 'Actief' },
          { getal: inactief.length, tekst: 'Uitgeschreven' },
          { getal: actief.filter(s => s.frequentie === 'wekelijks').length, tekst: 'Wekelijks' },
          { getal: actief.filter(s => s.frequentie === 'maandelijks').length, tekst: 'Maandelijks' },
        ].map(({ getal, tekst }) => (
          <div key={tekst} style={s.statCard}>
            <div style={s.statGetal}>{getal}</div>
            <div style={s.statTekst}>{tekst}</div>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.h2}>Subscribers</h2>
          {laden && <span style={s.laadTekst}>Laden…</span>}
          {fout && <span style={{ color: '#A32D2D', fontSize: 13 }}>{fout}</span>}
        </div>

        <div style={s.tabelWrapper}>
          <table style={s.tabel}>
            <thead>
              <tr>
                {['Naam', 'E-mail', 'Vakgebied', 'Frequentie', 'Aangemeld', 'Laatste mail', 'Status', 'Actie'].map(kol => (
                  <th key={kol} style={s.th}>{kol}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.map(sub => {
                const status = sendStatus[sub.email] ?? 'idle'
                return (
                  <tr key={sub.id} style={{ opacity: sub.actief ? 1 : 0.5 }}>
                    <td style={s.td}><strong>{sub.naam}</strong></td>
                    <td style={{ ...s.td, color: '#666', fontSize: 13 }}>{sub.email}</td>
                    <td style={s.td}>{sub.vakgebied}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: sub.frequentie === 'wekelijks' ? '#EEEDFE' : '#EAF3DE', color: sub.frequentie === 'wekelijks' ? '#3C3489' : '#27500A' }}>
                        {sub.frequentie}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#888', fontSize: 13 }}>{formatDatum(sub.aangemeld_op)}</td>
                    <td style={{ ...s.td, color: '#888', fontSize: 13 }}>{formatDatum(sub.laatste_mail_op)}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: sub.actief ? '#EAF3DE' : '#f5f5f5', color: sub.actief ? '#27500A' : '#999' }}>
                        {sub.actief ? 'Actief' : 'Uitgeschreven'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {sub.actief && (
                        <div>
                          <button
                            style={{ ...s.sendBtn, opacity: status === 'laden' ? 0.5 : 1 }}
                            onClick={() => verstuurNieuwsbrief(sub.email)}
                            disabled={status === 'laden'}
                            title={sendDetail[sub.email]}
                          >
                            {status === 'laden' ? 'Bezig…'
                              : status === 'succes' ? '✓ Verstuurd'
                              : status === 'geen-updates' ? '— Geen updates'
                              : status === 'fout' ? '✗ Fout'
                              : 'Verstuur'}
                          </button>
                          {sendDetail[sub.email] && (
                            <div style={{ fontSize: 11, color: status === 'fout' ? '#A32D2D' : '#888', marginTop: 4, maxWidth: 180 }}>
                              {sendDetail[sub.email]}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!laden && subscribers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#aaa', padding: '2rem' }}>
                    Nog geen subscribers aangemeld.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  pagina: { minHeight: '100vh', background: '#f7f7f5', padding: '2rem', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', maxWidth: 1100, margin: '0 auto 1.5rem' },
  label: { fontSize: 12, fontWeight: 500, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  h2: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  uitlogBtn: { background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#555', fontFamily: 'inherit' },
  statsRij: { display: 'flex', gap: 12, marginBottom: '1.5rem', maxWidth: 1100, margin: '0 auto 1.5rem', flexWrap: 'wrap' as const },
  statCard: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1rem 1.5rem', flex: '1 1 140px' },
  statGetal: { fontSize: 28, fontWeight: 700, color: '#534AB7', lineHeight: 1 },
  statTekst: { fontSize: 12, color: '#888', marginTop: 4 },
  card: { background: '#fff', border: '1px solid #eee', borderRadius: 16, maxWidth: 1100, margin: '0 auto' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' },
  laadTekst: { fontSize: 13, color: '#aaa' },
  tabelWrapper: { overflowX: 'auto' as const },
  tabel: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: { textAlign: 'left' as const, padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 16px', borderBottom: '1px solid #f7f7f5', verticalAlign: 'top' as const, color: '#333' },
  badge: { display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20 },
  sendBtn: { fontSize: 12, fontWeight: 500, padding: '6px 14px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit' },
}
