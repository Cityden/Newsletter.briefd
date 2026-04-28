'use client'
import { useState } from 'react'
import Link from 'next/link'

const ORG_OPTIES = [
  { value: 'zzp', label: 'ZZP' },
  { value: 'mkb', label: 'MKB (10–250)' },
  { value: 'groot', label: 'Groot bedrijf (250+)' },
  { value: 'overheid', label: 'Overheid / non-profit' },
]

const BRANCHE_OPTIES = [
  'Horeca & Toerisme',
  'Detailhandel & Retail',
  'Financiële dienstverlening',
  'Gezondheidszorg & Welzijn',
  'Bouw & Vastgoed',
  'Industrie & Productie',
  'Transport & Logistiek',
  'ICT & Tech',
  'Onderwijs & Onderzoek',
  'Zakelijke dienstverlening',
  'Overheid & Non-profit',
  'Energie & Utilities',
  'Agri, Food & Farma',
  'Media & Communicatie',
  'Anders',
]

const STIJL_OPTIES = [
  { value: 'kort', label: 'Kort & bondig', desc: 'Alleen wat ik moet weten, max 5 min lezen' },
  { value: 'uitgebreid', label: 'Uitgebreid', desc: 'Met context, voorbeelden en achtergrond' },
]

const REGIO_OPTIES = ['Nederland', 'Europa (EU)', 'Internationaal']

export default function InschrijvenPage() {
  const [stap, setStap] = useState(1)
  const [form, setForm] = useState({
    naam: '', email: '', vakgebied: '', branche: '', organisatie: 'mkb', frequentie: 'wekelijks',
    voorkeuren: {
      stijl: 'kort',
      regio: ['Nederland'],
      extraOnderwerpen: '',
      alleenHogeImpact: false,
    }
  })
  const [status, setStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')

  function toggleRegio(r: string) {
    setForm(f => {
      const huidig = f.voorkeuren.regio
      const nieuw = huidig.includes(r) ? huidig.filter(x => x !== r) : [...huidig, r]
      return { ...f, voorkeuren: { ...f.voorkeuren, regio: nieuw } }
    })
  }

  async function submit() {
    setStatus('laden')
    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setStatus(res.ok ? 'succes' : 'fout')
  }

  if (status === 'succes') return (
    <Pagina stap={0}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: 52, height: 52, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 20, color: '#4ade80' }}>✓</div>
        <h1 style={s.h1}>Je bent aangemeld!</h1>
        <p style={s.sub}>
          Je eerste nieuwsbrief ontvang je {form.frequentie === 'wekelijks' ? 'volgende week maandag' : 'begin volgende maand'}.<br />
          Via de link in de mail kun je je voorkeuren altijd aanpassen.
        </p>
        <Link href="/" style={{ ...s.ctaPrimary, display: 'inline-block', width: 'auto', padding: '11px 28px', marginTop: 24 }}>
          ← Terug naar home
        </Link>
      </div>
    </Pagina>
  )

  return (
    <Pagina stap={stap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');`}</style>

      {stap === 1 && (
        <>
          <div style={s.stapLabel}>Stap 1 van 2</div>
          <h1 style={s.h1}>Jouw profiel</h1>
          <p style={s.sub}>Vul in wie je bent, zodat Briefd de juiste updates kan selecteren.</p>

          <div style={s.field}>
            <label style={s.label}>Naam</label>
            <input
              style={s.input}
              placeholder="Jouw naam"
              value={form.naam}
              onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>E-mailadres</label>
            <input
              style={s.input}
              type="email"
              placeholder="jouw@email.nl"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Vakgebied of functie</label>
            <input
              style={s.input}
              placeholder="Bijv. Marketing, Finance, HR, Inkoop…"
              value={form.vakgebied}
              onChange={e => setForm(f => ({ ...f, vakgebied: e.target.value }))}
            />
            <div style={s.hint}>Vul vrij in — Briefd past zich automatisch aan</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              Branche <span style={{ color: '#333', fontWeight: 400 }}>(optioneel)</span>
            </label>
            <select
              style={{ ...s.input, cursor: 'pointer' }}
              value={form.branche}
              onChange={e => setForm(f => ({ ...f, branche: e.target.value }))}
            >
              <option value="">Selecteer jouw branche…</option>
              {BRANCHE_OPTIES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div style={s.hint}>Briefd houdt rekening met branche-specifieke regelgeving</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Organisatie</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ORG_OPTIES.map(o => (
                <button
                  key={o.value}
                  style={{ ...s.optBtn, ...(form.organisatie === o.value ? s.optBtnOn : {}) }}
                  onClick={() => setForm(f => ({ ...f, organisatie: o.value }))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Frequentie</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['wekelijks', 'maandelijks'] as const).map(f => (
                <button
                  key={f}
                  style={{ ...s.optBtn, ...(form.frequentie === f ? s.optBtnOn : {}) }}
                  onClick={() => setForm(p => ({ ...p, frequentie: f }))}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ ...s.ctaPrimary, opacity: (!form.naam || !form.email || !form.vakgebied) ? .4 : 1 }}
            onClick={() => setStap(2)}
            disabled={!form.naam || !form.email || !form.vakgebied}
          >
            Volgende →
          </button>
        </>
      )}

      {stap === 2 && (
        <>
          <div style={s.stapLabel}>Stap 2 van 2</div>
          <h1 style={s.h1}>Jouw voorkeuren</h1>
          <p style={s.sub}>Optioneel — maar hoe meer je invult, hoe relevanter je nieuwsbrief wordt.</p>

          <div style={s.field}>
            <label style={s.label}>Schrijfstijl</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {STIJL_OPTIES.map(o => (
                <button
                  key={o.value}
                  style={{ ...s.optBtn, ...(form.voorkeuren.stijl === o.value ? s.optBtnOn : {}), textAlign: 'left', height: 'auto', padding: '12px 14px' }}
                  onClick={() => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, stijl: o.value } }))}
                >
                  <div style={{ fontWeight: 600, marginBottom: 3, fontSize: 13 }}>{o.label}</div>
                  <div style={{ fontSize: 11, opacity: .6, fontWeight: 400 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Regio</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGIO_OPTIES.map(r => (
                <button
                  key={r}
                  style={{ ...s.chip, ...(form.voorkeuren.regio.includes(r) ? s.chipOn : {}) }}
                  onClick={() => toggleRegio(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={s.hint}>Selecteer meerdere regio&apos;s als dat relevant is</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              Extra onderwerpen of trefwoorden{' '}
              <span style={{ color: '#333', fontWeight: 400 }}>(optioneel)</span>
            </label>
            <textarea
              style={{ ...s.input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Bijv. pensioen, AI Act, cao detailhandel, DORA…"
              value={form.voorkeuren.extraOnderwerpen}
              onChange={e => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, extraOnderwerpen: e.target.value } }))}
            />
            <div style={s.hint}>Briefd let extra op updates die hierop aansluiten</div>
          </div>

          <div style={s.field}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{ width: 40, height: 22, borderRadius: 11, background: form.voorkeuren.alleenHogeImpact ? '#4ade80' : '#1e1e1e', border: `1px solid ${form.voorkeuren.alleenHogeImpact ? 'rgba(74,222,128,.4)' : '#2a2a2a'}`, position: 'relative', transition: 'background .2s', flexShrink: 0, cursor: 'pointer' }}
                onClick={() => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, alleenHogeImpact: !f.voorkeuren.alleenHogeImpact } }))}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: form.voorkeuren.alleenHogeImpact ? '#0a0a0a' : '#333', position: 'absolute', top: 2, left: form.voorkeuren.alleenHogeImpact ? 21 : 2, transition: 'left .2s' }}></div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#c8c8c6' }}>Alleen hoge-impact updates</div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>Ontvang alleen updates die directe actie vereisen</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={s.ctaSecondary} onClick={() => setStap(1)}>← Terug</button>
            <button
              style={{ ...s.ctaPrimary, flex: 1, opacity: status === 'laden' ? .5 : 1 }}
              onClick={submit}
              disabled={status === 'laden'}
            >
              {status === 'laden' ? 'Aanmelden…' : 'Aanmelden'}
            </button>
          </div>

          {status === 'fout' && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#f87171', textAlign: 'center' }}>
              Er ging iets mis. Probeer het opnieuw.
            </div>
          )}
        </>
      )}
    </Pagina>
  )
}

function Pagina({ children, stap }: { children: React.ReactNode; stap: number }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 1rem 60px', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ width: '100%', borderBottom: '1px solid #1a1a1a', padding: '0 2rem', marginBottom: 48 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ fontFamily: "'DM Serif Display'", fontSize: 18, color: '#e8e8e6', letterSpacing: '-.2px', textDecoration: 'none' }}>
            ◈ Briefd
          </Link>
        </div>
      </nav>

      {/* Card */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: '36px 40px', maxWidth: 480, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,.4)' }}>

        {/* Progress bar */}
        {stap > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {[1, 2].map(n => (
              <div
                key={n}
                style={{ flex: 1, height: 2, borderRadius: 2, background: n <= stap ? '#4ade80' : '#1e1e1e', transition: 'background .3s' }}
              ></div>
            ))}
          </div>
        )}

        {children}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 24, fontSize: 11, color: '#2a2a2a', textAlign: 'center' }}>
        Via de link in elke mail kun je je voorkeuren aanpassen of je uitschrijven.
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  stapLabel: { fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 },
  h1: { fontFamily: "'DM Serif Display'", fontSize: 26, fontWeight: 400, color: '#f0f0ee', margin: '0 0 8px', letterSpacing: '-.3px' },
  sub: { fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 28px' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 7 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #1e1e1e', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#0e0e0e', color: '#e8e8e6' },
  hint: { fontSize: 11, color: '#2a2a2a', marginTop: 5 },
  optBtn: { padding: '10px 14px', fontSize: 13, border: '1px solid #1e1e1e', borderRadius: 8, background: '#0e0e0e', cursor: 'pointer', fontFamily: 'inherit', color: '#555', transition: 'all .12s', width: '100%' },
  optBtnOn: { background: 'rgba(74,222,128,.08)', borderColor: 'rgba(74,222,128,.25)', color: '#4ade80', fontWeight: 600 },
  chip: { padding: '7px 16px', fontSize: 13, border: '1px solid #1e1e1e', borderRadius: 20, background: '#0e0e0e', cursor: 'pointer', fontFamily: 'inherit', color: '#555' },
  chipOn: { background: 'rgba(74,222,128,.08)', borderColor: 'rgba(74,222,128,.25)', color: '#4ade80', fontWeight: 500 },
  ctaPrimary: { width: '100%', padding: 13, background: '#4ade80', color: '#0a0a0a', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', letterSpacing: '-.01em' },
  ctaSecondary: { padding: '13px 20px', background: '#0e0e0e', color: '#555', border: '1px solid #1e1e1e', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
}
