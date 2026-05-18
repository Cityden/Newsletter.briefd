'use client'
import { useState } from 'react'

const LAND_OPTIES = [
  { value: 'NL', label: 'Nederland' },
  { value: 'BE', label: 'België' },
  { value: 'DE', label: 'Duitsland' },
  { value: 'FR', label: 'Frankrijk' },
  { value: 'GB', label: 'Verenigd Koninkrijk' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'AT', label: 'Oostenrijk' },
  { value: 'CH', label: 'Zwitserland' },
  { value: 'ES', label: 'Spanje' },
  { value: 'IT', label: 'Italië' },
  { value: 'PL', label: 'Polen' },
  { value: 'DK', label: 'Denemarken' },
  { value: 'SE', label: 'Zweden' },
  { value: 'FI', label: 'Finland' },
  { value: 'IE', label: 'Ierland' },
  { value: 'US', label: 'Verenigde Staten' },
]

const TAAL_OPTIES = [
  { value: '',           label: 'Automatisch (op basis van land)' },
  { value: 'Nederlands', label: 'Nederlands' },
  { value: 'Engels',     label: 'Engels' },
  { value: 'Duits',      label: 'Duits' },
  { value: 'Frans',      label: 'Frans' },
  { value: 'Spaans',     label: 'Spaans' },
  { value: 'Italiaans',  label: 'Italiaans' },
]

export default function TestNieuwsbriefPage() {
  const [form, setForm] = useState({
    email: '', vakgebied: '', organisatie: 'mkb', secret: '',
    branche: '', land: 'NL', extraOnderwerpen: '', taal: '',
  })
  const [status, setStatus] = useState<'idle' | 'laden' | 'succes' | 'fout'>('idle')
  const [resultaat, setResultaat] = useState<Record<string, unknown> | null>(null)
  const [bronnenStatus, setBronnenStatus] = useState<'idle' | 'laden' | 'klaar'>('idle')
  const [bronnenResultaat, setBronnenResultaat] = useState<{ naam: string; url: string }[] | null>(null)

  async function controleerBronnen() {
    setBronnenStatus('laden')
    setBronnenResultaat(null)
    const res = await fetch('/api/test-bronnen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${form.secret}` },
      body: JSON.stringify({
        vakgebied: form.vakgebied,
        branche: form.branche || undefined,
        land: form.land,
        extraOnderwerpen: form.extraOnderwerpen || undefined,
      }),
    })
    const data = await res.json()
    setBronnenResultaat(data.bronnen ?? [])
    setBronnenStatus('klaar')
  }

  async function verstuur() {
    setStatus('laden')
    setResultaat(null)
    const res = await fetch('/api/test-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${form.secret}` },
      body: JSON.stringify({
        email: form.email,
        vakgebied: form.vakgebied,
        organisatie: form.organisatie,
        branche: form.branche || undefined,
        land: form.land,
        voorkeuren: {
          taal: form.taal || undefined,
          extraOnderwerpen: form.extraOnderwerpen || '',
          stijl: 'kort',
          regio: ['Nederland'],
          alleenHogeImpact: false,
        },
      }),
    })
    const data = await res.json()
    setResultaat(data)
    setStatus(res.ok ? 'succes' : 'fout')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', padding: '40px 1rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #ececea', padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Testnieuwsbrief versturen</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Test de bronnen, taal en inhoud zonder een echte abonnee te verstoren.</p>

        {/* Verplichte velden */}
        {[
          { key: 'email', label: 'E-mailadres', placeholder: 'jouw@email.nl', type: 'email' },
          { key: 'vakgebied', label: 'Vakgebied', placeholder: 'Bijv. Finance, HR, Inkoop, Employment Law…', type: 'text' },
          { key: 'secret', label: 'CRON_SECRET', placeholder: 'Jouw geheime sleutel uit .env', type: 'password' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={s.label}>{label}</label>
            <input
              type={type}
              style={s.input}
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}

        {/* Land + taal naast elkaar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={s.label}>Land</label>
            <select style={s.select} value={form.land} onChange={e => setForm(f => ({ ...f, land: e.target.value }))}>
              {LAND_OPTIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Taal</label>
            <select style={s.select} value={form.taal} onChange={e => setForm(f => ({ ...f, taal: e.target.value }))}>
              {TAAL_OPTIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Branche */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Branche <span style={{ fontWeight: 400, color: '#aaa' }}>(optioneel)</span></label>
          <input
            type="text"
            style={s.input}
            placeholder="Bijv. Gezondheidszorg, Detailhandel…"
            value={form.branche}
            onChange={e => setForm(f => ({ ...f, branche: e.target.value }))}
          />
        </div>

        {/* Extra onderwerpen */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Extra onderwerpen <span style={{ fontWeight: 400, color: '#aaa' }}>(optioneel)</span></label>
          <input
            type="text"
            style={s.input}
            placeholder="Bijv. pensioen, AI Act, DORA…"
            value={form.extraOnderwerpen}
            onChange={e => setForm(f => ({ ...f, extraOnderwerpen: e.target.value }))}
          />
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Test of er aanvullende bronnen worden gevonden</div>
        </div>

        {/* Bronnen controleren */}
        <button
          style={{ width: '100%', padding: 10, background: '#f5f5f5', color: '#444', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: bronnenStatus === 'laden' || !form.vakgebied || !form.secret ? 'not-allowed' : 'pointer', marginBottom: 8, opacity: !form.vakgebied || !form.secret ? 0.5 : 1 }}
          onClick={controleerBronnen}
          disabled={!form.vakgebied || !form.secret || bronnenStatus === 'laden'}
        >
          {bronnenStatus === 'laden' ? 'Bronnen ophalen…' : '🔍 Bronnen controleren (zonder mail)'}
        </button>

        {bronnenStatus === 'klaar' && bronnenResultaat && (
          <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: bronnenResultaat.length > 0 ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${bronnenResultaat.length > 0 ? '#97C459' : '#E8A0A0'}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: bronnenResultaat.length > 0 ? '#27500A' : '#791F1F', marginBottom: 6 }}>
              {bronnenResultaat.length > 0 ? `${bronnenResultaat.length} bronnen gevonden` : 'Geen werkende bronnen gevonden'}
            </div>
            {bronnenResultaat.map((b, i) => (
              <div key={i} style={{ fontSize: 12, color: '#444', marginBottom: 3 }}>
                <strong>{b.naam}</strong>
                <span style={{ color: '#aaa', marginLeft: 6, wordBreak: 'break-all' }}>{b.url}</span>
              </div>
            ))}
          </div>
        )}

        {/* Organisatie */}
        <div style={{ marginBottom: 24 }}>
          <label style={s.label}>Organisatie</label>
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
          {status === 'laden' ? 'Bezig…' : 'Verstuur testnieuwsbrief'}
        </button>

        {resultaat && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: status === 'succes' ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${status === 'succes' ? '#97C459' : '#E8A0A0'}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: status === 'succes' ? '#27500A' : '#791F1F', marginBottom: 8 }}>
              {status === 'succes' ? '✓ Testmail verstuurd!' : '✕ Er ging iets mis'}
            </div>
            {status === 'succes' && Array.isArray(resultaat.bronnen) && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Gebruikte bronnen:</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                  {(resultaat.bronnen as string[]).map((b, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#444', marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <pre style={{ fontSize: 11, color: '#555', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify({ ...resultaat, bronnen: undefined }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e5e5', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e5e5', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer', background: '#fff' },
}
