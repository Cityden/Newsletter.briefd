'use client'
import { useState } from 'react'
import Link from 'next/link'

const ORG_OPTIES = [
  { value: 'zzp', label: 'ZZP' },
  { value: 'mkb', label: 'MKB (10–250)' },
  { value: 'groot', label: 'Groot bedrijf (250+)' },
  { value: 'overheid', label: 'Overheid / non-profit' },
]

const STIJL_OPTIES = [
  { value: 'kort', label: 'Kort & bondig', desc: 'Alleen wat ik moet weten, max 5 min lezen' },
  { value: 'uitgebreid', label: 'Uitgebreid', desc: 'Met context, voorbeelden en achtergrond' },
]

const REGIO_OPTIES = ['Nederland', 'Europa (EU)', 'Internationaal']

export default function InschrijvenPage() {
  const [stap, setStap] = useState(1)
  const [form, setForm] = useState({
    naam: '', email: '', vakgebied: '', organisatie: 'mkb', frequentie: 'wekelijks',
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
    <Page stap={0}>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 56, height: 56, background: '#E6F2EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: '#2A5C45', fontWeight: 700 }}>✓</div>
        <h1 style={s.h1}>Je bent aangemeld!</h1>
        <p style={s.sub}>Je eerste nieuwsbrief ontvang je {form.frequentie === 'wekelijks' ? 'volgende week maandag' : 'begin volgende maand'}.<br />Via de link in de mail kun je je voorkeuren altijd aanpassen.</p>
        <Link href="/" style={{ ...s.ctaPrimary, display: 'inline-block', marginTop: 24, width: 'auto', padding: '12px 28px' }}>← Terug naar home</Link>
      </div>
    </Page>
  )

  return (
    <Page stap={stap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');`}</style>

      {stap === 1 && (
        <>
          <div style={s.stapLabel}>Stap 1 van 2</div>
          <h1 style={s.h1}>Jouw profiel</h1>
          <p style={s.sub}>Vul in wie je bent, zodat Briefd de juiste updates kan selecteren.</p>

          <div style={s.field}>
            <label style={s.label}>Naam</label>
            <input style={s.input} placeholder="Jouw naam" value={form.naam}
              onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} />
          </div>

          <div style={s.field}>
            <label style={s.label}>E-mailadres</label>
            <input style={s.input} type="email" placeholder="jouw@email.nl" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Vakgebied of functie</label>
            <input style={s.input} placeholder="Bijv. Marketing, Finance, HR, Inkoop…" value={form.vakgebied}
              onChange={e => setForm(f => ({ ...f, vakgebied: e.target.value }))} />
            <div style={s.hint}>Vul vrij in — Briefd past zich automatisch aan</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Organisatie</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ORG_OPTIES.map(o => (
                <button key={o.value} style={{ ...s.optBtn, ...(form.organisatie === o.value ? s.optBtnOn : {}) }}
                  onClick={() => setForm(f => ({ ...f, organisatie: o.value }))}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Frequentie</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['wekelijks', 'maandelijks'] as const).map(f => (
                <button key={f} style={{ ...s.optBtn, ...(form.frequentie === f ? s.optBtnOn : {}) }}
                  onClick={() => setForm(p => ({ ...p, frequentie: f }))}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button style={{ ...s.ctaPrimary, opacity: (!form.naam || !form.email || !form.vakgebied) ? .45 : 1 }}
            onClick={() => setStap(2)} disabled={!form.naam || !form.email || !form.vakgebied}>
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
                <button key={o.value}
                  style={{ ...s.optBtn, ...(form.voorkeuren.stijl === o.value ? s.optBtnOn : {}), textAlign: 'left', height: 'auto', padding: '12px 14px' }}
                  onClick={() => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, stijl: o.value } }))}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{o.label}</div>
                  <div style={{ fontSize: 11, opacity: .65, fontWeight: 400 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Regio</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGIO_OPTIES.map(r => (
                <button key={r}
                  style={{ ...s.chip, ...(form.voorkeuren.regio.includes(r) ? s.chipOn : {}) }}
                  onClick={() => toggleRegio(r)}>
                  {r}
                </button>
              ))}
            </div>
            <div style={s.hint}>Selecteer meerdere regio&apos;s als dat relevant is</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Extra onderwerpen of trefwoorden <span style={{ color: '#ccc', fontWeight: 400 }}>(optioneel)</span></label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Bijv. pensioen, AI Act, cao detailhandel, DORA…"
              value={form.voorkeuren.extraOnderwerpen}
              onChange={e => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, extraOnderwerpen: e.target.value } }))} />
            <div style={s.hint}>Briefd let extra op updates die hierop aansluiten</div>
          </div>

          <div style={s.field}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.voorkeuren.alleenHogeImpact ? '#2A5C45' : '#e0e0e0',
                position: 'relative', transition: 'background .2s', flexShrink: 0, cursor: 'pointer'
              }} onClick={() => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, alleenHogeImpact: !f.voorkeuren.alleenHogeImpact } }))}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2, left: form.voorkeuren.alleenHogeImpact ? 20 : 2,
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
                }}></div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Alleen hoge-impact updates</div>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>Ontvang alleen updates die directe actie vereisen</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={s.ctaSecondary} onClick={() => setStap(1)}>← Terug</button>
            <button style={{ ...s.ctaPrimary, flex: 1, opacity: status === 'laden' ? .5 : 1 }}
              onClick={submit} disabled={status === 'laden'}>
              {status === 'laden' ? 'Aanmelden…' : 'Aanmelden'}
            </button>
          </div>

          {status === 'fout' && <div style={{ marginTop: 12, fontSize: 13, color: '#A32D2D', textAlign: 'center' }}>Er ging iets mis. Probeer opnieuw.</div>}
        </>
      )}
    </Page>
  )
}

function Page({ children, stap }: { children: React.ReactNode; stap: number }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 1rem', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e8e6', padding: '40px', maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.05)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#aaa', marginBottom: 28, textDecoration: 'none', fontWeight: 500 }}>
          ← Briefd
        </Link>

        {/* Progress bar */}
        {stap > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= stap ? '#2A5C45' : '#ececea', transition: 'background .3s' }}></div>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  stapLabel: { fontSize: 11, fontWeight: 600, color: '#2A5C45', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 },
  h1: { fontFamily: "'DM Serif Display'", fontSize: 26, fontWeight: 400, color: '#1a1a1a', margin: '0 0 8px', letterSpacing: '-.3px' },
  sub: { fontSize: 14, color: '#888', lineHeight: 1.65, margin: '0 0 28px' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 7 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e5e5', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#1a1a1a' },
  hint: { fontSize: 11, color: '#ccc', marginTop: 5 },
  optBtn: { padding: '10px 14px', fontSize: 13, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#666', transition: 'all .12s', width: '100%' },
  optBtnOn: { background: '#E6F2EC', borderColor: '#A3C9B5', color: '#1A3D2E', fontWeight: 600 },
  chip: { padding: '7px 16px', fontSize: 13, border: '1px solid #e5e5e5', borderRadius: 20, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#777' },
  chipOn: { background: '#E6F2EC', borderColor: '#A3C9B5', color: '#1A3D2E', fontWeight: 500 },
  ctaPrimary: { width: '100%', padding: 13, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', letterSpacing: '-.01em' },
  ctaSecondary: { padding: '13px 20px', background: '#fff', color: '#666', border: '1px solid #e5e5e5', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
}
