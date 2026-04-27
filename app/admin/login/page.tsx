'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [wachtwoord, setWachtwoord] = useState('')
  const [status, setStatus] = useState<'idle' | 'laden' | 'fout'>('idle')
  const router = useRouter()

  async function login() {
    if (!wachtwoord) return
    setStatus('laden')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wachtwoord }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setStatus('fout')
    }
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.label}>Regelgeving nieuwsbrief</div>
        <h1 style={s.h1}>Admin</h1>
        <p style={s.sub}>Voer het beheerderswachtwoord in om verder te gaan.</p>

        <div style={s.field}>
          <label style={s.fieldLabel}>Wachtwoord</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={wachtwoord}
            onChange={e => { setWachtwoord(e.target.value); setStatus('idle') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
        </div>

        {status === 'fout' && (
          <div style={s.fout}>Ongeldig wachtwoord. Probeer opnieuw.</div>
        )}

        <button
          style={{ ...s.cta, opacity: (!wachtwoord || status === 'laden') ? 0.5 : 1 }}
          onClick={login}
          disabled={!wachtwoord || status === 'laden'}
        >
          {status === 'laden' ? 'Inloggen…' : 'Inloggen'}
        </button>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #eee', padding: '2.5rem', maxWidth: 400, width: '100%' },
  label: { fontSize: 12, fontWeight: 500, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  sub: { fontSize: 14, color: '#777', lineHeight: 1.6, margin: '0 0 24px' },
  field: { marginBottom: 16 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e0e0e0', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  fout: { marginBottom: 12, fontSize: 13, color: '#A32D2D' },
  cta: { width: '100%', padding: 12, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
}
