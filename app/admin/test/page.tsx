'use client'
import { useState } from 'react'

export default function TestNieuwsbriefPage() {
  const [form, setForm] = useState({ email: '', vakgebied: '', organisatie: 'mkb', secret: '' })
  const [status, setStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')
  const [resultaat, setResultaat] = useState<Record<string, unknown> | null>(null)

  async function verstuur() {
    setStatus('laden')
    setResultaat(null)
    const res = await fetch('/api/test-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${form.secret}` },
      body: JSON.stringify({ email: form.email, vakgebied: form.vakgebied, organisatie: form.organisatie }),
    })
    const data = await res.json()
    setResultaat(data)
    setStatus(res.ok ? 'succes' : 'fout')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', padding: '40px 1rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #ececea', padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Testnieuwsbrief versturen</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Verstuur een echte nieuwsbrief naar een testadres om te controleren of alles werkt.</p>

        {[
          { key: 'email', label: 'E-mailadres', placeholder: 'jouw@email.nl', type: 'email' },
          { key: 'vakgebied', label: 'Vakgebied', placeholder: 'Bijv. Finance, HR, Marketing…', type: 'text' },
          { key: 'secret', label: 'CRON_SECRET', placeholder: 'Jouw geheime sleutel uit .env', type: 'password' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 }}>{label}</label>
            <input
              type={type}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e5e5', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 }}>Organisatie</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {[['zzp','ZZP'],['mkb','MKB'],['groot','Groot bedrijf'],['overheid','Overheid']].map(([v,l]) => (
              <button key={v}
                style={{ padding: '8px', fontSize: 13, border: `1px solid ${form.organisatie === v ? '#AFA9EC' : '#e5e5e5'}`, borderRadius: 8, background: form.organisatie === v ? '#EEEDFE' : '#fff', cursor: 'pointer', color: form.organisatie === v ? '#3C3489' : '#555', fontWeight: form.organisatie === v ? 600 : 400 }}
                onClick={() => setForm(f => ({ ...f, organisatie: v }))}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{ width: '100%', padding: 12, background: status === 'laden' ? '#888' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: status === 'laden' ? 'not-allowed' : 'pointer' }}
          onClick={verstuur}
          disabled={!form.email || !form.vakgebied || !form.secret || status === 'laden'}>
          {status === 'laden' ? 'Bezig met versturen…' : 'Verstuur testnieuwsbrief'}
        </button>

        {resultaat && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: status === 'succes' ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${status === 'succes' ? '#97C459' : '#E8A0A0'}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: status === 'succes' ? '#27500A' : '#791F1F', marginBottom: 8 }}>
              {status === 'succes' ? '✓ Testmail verstuurd!' : '✕ Er ging iets mis'}
            </div>
            <pre style={{ fontSize: 11, color: '#555', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(resultaat, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
