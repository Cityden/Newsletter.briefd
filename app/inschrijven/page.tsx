'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getLocaleFromCookie, teksten, type Locale } from '@/lib/locale'

export default function InschrijvenPage() {
  const [locale, setLocale] = useState<Locale>('nl')
  useEffect(() => { setLocale(getLocaleFromCookie()) }, [])
  const t = teksten[locale]

  const [stap, setStap] = useState(1)
  const [form, setForm] = useState({
    naam: '', email: '', vakgebied: '', branche: '', organisatie: 'mkb', frequentie: 'wekelijks',
    land: 'NL',
    voorkeuren: {
      stijl: 'kort',
      regio: [t.regiOpties[0]] as string[],
      extraOnderwerpen: '',
      alleenHogeImpact: false,
      taal: '',
    }
  })
  const [status, setStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')

  // Keep default regio in sync when locale loads
  useEffect(() => {
    setForm(f => ({
      ...f,
      voorkeuren: {
        ...f.voorkeuren,
        regio: f.voorkeuren.regio.length === 0 ? [teksten[locale].regiOpties[0]] : f.voorkeuren.regio,
      },
    }))
  }, [locale])

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
    <Pagina stap={0} footerNote={t.footerNote}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: 52, height: 52, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 20, color: '#4ade80' }}>✓</div>
        <h1 style={s.h1}>{t.succesTitle}</h1>
        <p style={s.sub} dangerouslySetInnerHTML={{ __html: t.succesSub(form.frequentie).replace('\n', '<br />') }} />
        <Link href="/" style={{ ...s.ctaPrimary, display: 'inline-block', width: 'auto', padding: '11px 28px', marginTop: 24 }}>
          {t.knopTerugHome}
        </Link>
      </div>
    </Pagina>
  )

  return (
    <Pagina stap={stap} footerNote={t.footerNote}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        @media (max-width: 480px) { .inschrijven-card { padding: 24px 20px !important; } }
      `}</style>

      {stap === 1 && (
        <>
          <div style={s.stapLabel}>{t.inschrijvenStap1}</div>
          <h1 style={s.h1}>{t.inschrijvenTitel1}</h1>
          <p style={s.sub}>{t.inschrijvenSub1}</p>

          <div style={s.field}>
            <label style={s.label}>{t.labelNaam}</label>
            <input
              style={s.input}
              placeholder={t.placeholderNaam}
              value={form.naam}
              onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>{t.labelEmail}</label>
            <input
              style={s.input}
              type="email"
              placeholder={t.placeholderEmail}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>{t.labelVakgebied}</label>
            <input
              style={s.input}
              placeholder={t.placeholderVakgebied}
              value={form.vakgebied}
              onChange={e => setForm(f => ({ ...f, vakgebied: e.target.value }))}
            />
            <div style={s.hint}>{t.hintVakgebied}</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>{t.labelLand}</label>
            <select
              style={{ ...s.input, cursor: 'pointer' }}
              value={form.land}
              onChange={e => setForm(f => ({ ...f, land: e.target.value }))}
            >
              {t.landOpties.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <div style={s.hint}>{t.hintLand}</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              {t.labelBranche} <span style={{ color: '#333', fontWeight: 400 }}>{t.optioneel}</span>
            </label>
            <select
              style={{ ...s.input, cursor: 'pointer' }}
              value={form.branche}
              onChange={e => setForm(f => ({ ...f, branche: e.target.value }))}
            >
              <option value="">{t.placeholderBranche}</option>
              {t.brancheOpties.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div style={s.hint}>{t.hintBranche}</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>{t.labelOrganisatie}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {t.orgOpties.map(o => (
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
            <label style={s.label}>{t.labelFrequentie}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {t.frequentieOpties.map(o => (
                <button
                  key={o.value}
                  style={{ ...s.optBtn, ...(form.frequentie === o.value ? s.optBtnOn : {}) }}
                  onClick={() => setForm(p => ({ ...p, frequentie: o.value }))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ ...s.ctaPrimary, opacity: (!form.naam || !form.email || !form.vakgebied) ? .4 : 1 }}
            onClick={() => setStap(2)}
            disabled={!form.naam || !form.email || !form.vakgebied}
          >
            {t.knopVolgende}
          </button>
        </>
      )}

      {stap === 2 && (
        <>
          <div style={s.stapLabel}>{t.inschrijvenStap2}</div>
          <h1 style={s.h1}>{t.inschrijvenTitel2}</h1>
          <p style={s.sub}>{t.inschrijvenSub2}</p>

          <div style={s.field}>
            <label style={s.label}>{t.labelStijl}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {t.stijlOpties.map(o => (
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
            <label style={s.label}>{t.labelTaal}</label>
            <select
              style={{ ...s.input, cursor: 'pointer' }}
              value={form.voorkeuren.taal}
              onChange={e => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, taal: e.target.value } }))}
            >
              {t.taalOpties.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>{t.labelRegio}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {t.regiOpties.map(r => (
                <button
                  key={r}
                  style={{ ...s.chip, ...(form.voorkeuren.regio.includes(r) ? s.chipOn : {}) }}
                  onClick={() => toggleRegio(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={s.hint}>{t.hintRegio}</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>
              {t.labelExtraOnderwerpen}{' '}
              <span style={{ color: '#333', fontWeight: 400 }}>{t.optioneel}</span>
            </label>
            <textarea
              style={{ ...s.input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder={t.placeholderExtraOnderwerpen}
              value={form.voorkeuren.extraOnderwerpen}
              onChange={e => setForm(f => ({ ...f, voorkeuren: { ...f.voorkeuren, extraOnderwerpen: e.target.value } }))}
            />
            <div style={s.hint}>{t.hintExtraOnderwerpen}</div>
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
                <div style={{ fontSize: 13, fontWeight: 500, color: '#c8c8c6' }}>{t.labelAlleenHogeImpact}</div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>{t.hintAlleenHogeImpact}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={s.ctaSecondary} onClick={() => setStap(1)}>{t.knopTerug}</button>
            <button
              style={{ ...s.ctaPrimary, flex: 1, opacity: status === 'laden' ? .5 : 1 }}
              onClick={submit}
              disabled={status === 'laden'}
            >
              {status === 'laden' ? t.knopAanmeldenLaden : t.knopAanmelden}
            </button>
          </div>

          {status === 'fout' && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#f87171', textAlign: 'center' }}>
              {t.foutMelding}
            </div>
          )}
        </>
      )}
    </Pagina>
  )
}

function Pagina({ children, stap, footerNote }: { children: React.ReactNode; stap: number; footerNote: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 1rem 60px', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ width: '100%', borderBottom: '1px solid #1a1a1a', padding: '0 2rem', marginBottom: 48 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ fontFamily: "'DM Serif Display'", fontSize: 18, color: '#e8e8e6', letterSpacing: '-.2px', textDecoration: 'none' }}>
            ◈ Brieft
          </Link>
        </div>
      </nav>

      {/* Card */}
      <div className="inschrijven-card" style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: '36px 40px', maxWidth: 480, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,.4)' }}>

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
        {footerNote}
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
