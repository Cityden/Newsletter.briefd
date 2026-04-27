'use client'
import { useState } from 'react'

const ORG_OPTIES = [
  { value: 'zzp', label: 'ZZP' },
  { value: 'mkb', label: 'MKB (10–250 medewerkers)' },
  { value: 'groot', label: 'Groot bedrijf (250+)' },
  { value: 'overheid', label: 'Overheid / non-profit' },
]

export default function InschrijvenPage() {
  const [form, setForm] = useState({
    naam: '', email: '', vakgebied: '', organisatie: 'mkb', frequentie: 'wekelijks'
  })
  const [status, setStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')

  async function submit() {
    if (!form.naam || !form.email || !form.vakgebied) return
    setStatus('laden')

    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setStatus(res.ok ? 'succes' : 'fout')
  }

  if (status === 'succes') return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h1 style={s.h1}>Aangemeld!</h1>
        <p style={s.sub}>
          Je eerste nieuwsbrief ontvang je {form.frequentie === 'wekelijks' ? 'volgende week' : 'begin volgende maand'}.
          Via de link in de mail kun je je voorkeuren altijd aanpassen.
        </p>
      </div>
    </main>
  )

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.label}>Regelgeving nieuwsbrief</div>
        <h1 style={s.h1}>Blijf op de hoogte van wat er speelt</h1>
        <p style={s.sub}>
          Ontvang een persoonlijke samenvatting van relevante wetswijzigingen,
          uitspraken en beleidsupdates — afgestemd op jouw vakgebied.
        </p>

        <div style={s.field}>
          <label style={s.fieldLabel}>Naam</label>
          <input
            style={s.input}
            placeholder="Jouw naam"
            value={form.naam}
            onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
          />
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel}>E-mailadres</label>
          <input
            style={s.input}
            type="email"
            placeholder="jouw@email.nl"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel}>Vakgebied of functie</label>
          <input
            style={s.input}
            placeholder="Bijv. Marketing, Finance, HR, Inkoop…"
            value={form.vakgebied}
            onChange={e => setForm(f => ({ ...f, vakgebied: e.target.value }))}
          />
          <div style={s.hint}>Vul vrij in — de nieuwsbrief past zich aan op jouw gebied</div>
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel}>Organisatie</label>
          <div style={s.orgGrid}>
            {ORG_OPTIES.map(o => (
              <button
                key={o.value}
                style={{ ...s.orgBtn, ...(form.organisatie === o.value ? s.orgBtnActive : {}) }}
                onClick={() => setForm(f => ({ ...f, organisatie: o.value }))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel}>Frequentie</label>
          <div style={s.freqRow}>
            {(['wekelijks', 'maandelijks'] as const).map(f => (
              <button
                key={f}
                style={{ ...s.freqBtn, ...(form.frequentie === f ? s.freqBtnActive : {}) }}
                onClick={() => setForm(p => ({ ...p, frequentie: f }))}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{
            ...s.cta,
            opacity: (!form.naam || !form.email || !form.vakgebied || status === 'laden') ? 0.5 : 1,
          }}
          onClick={submit}
          disabled={!form.naam || !form.email || !form.vakgebied || status === 'laden'}
        >
          {status === 'laden' ? 'Aanmelden…' : 'Aanmelden'}
        </button>

        {status === 'fout' && (
          <div style={s.fout}>Er ging iets mis. Probeer het opnieuw.</div>
        )}
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #eee', padding: '2.5rem', maxWidth: 480, width: '100%' },
  label: { fontSize: 12, fontWeight: 500, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' },
  sub: { fontSize: 14, color: '#777', lineHeight: 1.6, margin: '0 0 28px' },
  field: { marginBottom: 20 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e0e0e0', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  orgGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  orgBtn: { padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: '#555' },
  orgBtnActive: { background: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489', fontWeight: 500 },
  freqRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  freqBtn: { padding: '9px 0', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', color: '#555' },
  freqBtnActive: { background: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489', fontWeight: 500 },
  cta: { width: '100%', padding: 12, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' },
  fout: { marginTop: 12, fontSize: 13, color: '#A32D2D', textAlign: 'center' },
}
