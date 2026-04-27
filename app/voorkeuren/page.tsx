'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ORG_OPTIES = [
  { value: 'zzp', label: 'ZZP' },
  { value: 'mkb', label: 'MKB (10–250 medewerkers)' },
  { value: 'groot', label: 'Groot bedrijf (250+)' },
  { value: 'overheid', label: 'Overheid / non-profit' },
]

interface Subscriber {
  naam: string
  email: string
  vakgebied: string
  organisatie: string
  frequentie: string
  actief: boolean
}

function VoorkeurenForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const uitschrijven = params.get('uitschrijven') === '1'

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null)
  const [form, setForm] = useState({ vakgebied: '', organisatie: 'mkb', frequentie: 'wekelijks' })
  const [laadStatus, setLaadStatus] = useState<'laden' | 'geladen' | 'fout' | 'geen-token'>('laden')
  const [opslaanStatus, setOpslaanStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')
  const [uitgeschreven, setUitgeschreven] = useState(false)

  useEffect(() => {
    if (!token) { setLaadStatus('geen-token'); return }

    fetch(`/api/subscribers/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Subscriber) => {
        setSubscriber(data)
        setForm({ vakgebied: data.vakgebied, organisatie: data.organisatie, frequentie: data.frequentie })
        setLaadStatus('geladen')
        if (uitschrijven) handleUitschrijven(token)
      })
      .catch(() => setLaadStatus('fout'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleUitschrijven(t: string) {
    await fetch(`/api/subscribers/${t}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actief: false }),
    })
    setUitgeschreven(true)
  }

  async function opslaan() {
    if (!token) return
    setOpslaanStatus('laden')
    const res = await fetch(`/api/subscribers/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpslaanStatus(res.ok ? 'succes' : 'fout')
  }

  if (laadStatus === 'geen-token') return (
    <main style={s.page}>
      <div style={s.card}>
        <h1 style={s.h1}>Geen geldig token</h1>
        <p style={s.sub}>Gebruik de link uit je nieuwsbrief om je voorkeuren te wijzigen.</p>
      </div>
    </main>
  )

  if (laadStatus === 'fout') return (
    <main style={s.page}>
      <div style={s.card}>
        <h1 style={s.h1}>Link niet gevonden</h1>
        <p style={s.sub}>Deze link is niet geldig of verlopen.</p>
      </div>
    </main>
  )

  if (laadStatus === 'laden') return (
    <main style={s.page}>
      <div style={s.card}>
        <p style={s.sub}>Gegevens laden…</p>
      </div>
    </main>
  )

  if (uitgeschreven) return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h1 style={s.h1}>Uitgeschreven</h1>
        <p style={s.sub}>Je ontvangt geen nieuwsbrieven meer. Je kunt je altijd opnieuw aanmelden via de aanmeldpagina.</p>
      </div>
    </main>
  )

  if (opslaanStatus === 'succes') return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h1 style={s.h1}>Voorkeuren opgeslagen</h1>
        <p style={s.sub}>Je volgende nieuwsbrief wordt aangepast op basis van je nieuwe instellingen.</p>
      </div>
    </main>
  )

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.label}>Regelgeving nieuwsbrief</div>
        <h1 style={s.h1}>Voorkeuren van {subscriber?.naam}</h1>
        <p style={s.sub}>Pas hieronder je instellingen aan. De volgende nieuwsbrief houdt hier rekening mee.</p>

        <div style={s.field}>
          <label style={s.fieldLabel}>Vakgebied of functie</label>
          <input
            style={s.input}
            value={form.vakgebied}
            onChange={e => setForm(f => ({ ...f, vakgebied: e.target.value }))}
          />
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
          style={{ ...s.cta, opacity: opslaanStatus === 'laden' ? 0.5 : 1 }}
          onClick={opslaan}
          disabled={opslaanStatus === 'laden'}
        >
          {opslaanStatus === 'laden' ? 'Opslaan…' : 'Voorkeuren opslaan'}
        </button>

        {opslaanStatus === 'fout' && (
          <div style={s.fout}>Er ging iets mis. Probeer het opnieuw.</div>
        )}

        <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16, textAlign: 'center' }}>
          <button
            style={s.uitschrijfBtn}
            onClick={() => token && handleUitschrijven(token)}
          >
            Uitschrijven
          </button>
        </div>
      </div>
    </main>
  )
}

export default function VoorkeurenPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#aaa' }}>Laden…</p>
      </main>
    }>
      <VoorkeurenForm />
    </Suspense>
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
  orgGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  orgBtn: { padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: '#555' },
  orgBtnActive: { background: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489', fontWeight: 500 },
  freqRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  freqBtn: { padding: '9px 0', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', color: '#555' },
  freqBtnActive: { background: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489', fontWeight: 500 },
  cta: { width: '100%', padding: 12, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' },
  fout: { marginTop: 12, fontSize: 13, color: '#A32D2D', textAlign: 'center' },
  uitschrijfBtn: { background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' },
}
