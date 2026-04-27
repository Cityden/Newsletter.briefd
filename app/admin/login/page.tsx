'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ width: '100%', borderBottom: '1px solid #1a1a1a', padding: '0 2rem', marginBottom: 64 }}>
        <div style={{ maxWidth: 420, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ fontFamily: "'DM Serif Display'", fontSize: 18, color: '#e8e8e6', textDecoration: 'none', letterSpacing: '-.2px' }}>
            ◈ Briefd
          </Link>
        </div>
      </nav>

      {/* Card */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: '36px 40px', maxWidth: 420, width: 'calc(100% - 2rem)', boxShadow: '0 24px 48px rgba(0,0,0,.4)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Beheer</div>
        <h1 style={{ fontFamily: "'DM Serif Display'", fontSize: 26, fontWeight: 400, color: '#f0f0ee', margin: '0 0 8px', letterSpacing: '-.3px' }}>Admin</h1>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 28px' }}>Voer het beheerderswachtwoord in om verder te gaan.</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 7 }}>Wachtwoord</label>
          <input
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #1e1e1e', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#0e0e0e', color: '#e8e8e6' }}
            type="password"
            placeholder="••••••••"
            value={wachtwoord}
            onChange={e => { setWachtwoord(e.target.value); setStatus('idle') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
        </div>

        {status === 'fout' && (
          <div style={{ marginBottom: 14, fontSize: 13, color: '#f87171' }}>Ongeldig wachtwoord. Probeer opnieuw.</div>
        )}

        <button
          style={{ width: '100%', padding: 13, background: '#4ade80', color: '#0a0a0a', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!wachtwoord || status === 'laden') ? 0.4 : 1, letterSpacing: '-.01em' }}
          onClick={login}
          disabled={!wachtwoord || status === 'laden'}
        >
          {status === 'laden' ? 'Inloggen…' : 'Inloggen →'}
        </button>
      </div>
    </div>
  )
}
