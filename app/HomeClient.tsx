'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { teksten, type Locale } from '@/lib/locale'

const BRONNEN = ['Staatscourant', 'AFM', 'DNB', 'Rechtspraak.nl', 'Autoriteit Persoonsgegevens', 'NCSC', 'ACM', 'EUR-Lex', 'Belastingdienst', 'SZW', 'UWV', 'RVO', 'Europees Parlement']

// Locale en weekNummer komen van de server (app/page.tsx leest de locale-cookie
// via cookies()). Eerder werd hier client-side gestart met 'nl' en pas na mount
// gecorrigeerd — de eerste HTML die de browser (en elke crawler) zag was daardoor
// altijd Nederlands, ook op brieft.online.
export default function HomeClient({ locale, weekNummer }: { locale: Locale; weekNummer: number }) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  const t = teksten[locale]

  useEffect(() => {
    setVisible(true)
    const iv = setInterval(() => setCurrent(c => (c + 1) % t.vakgebieden.length), 2200)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0a', color: '#e8e8e6', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes marquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        .rotate { display:inline-block; animation: fadeUp .3s ease; }
        .marquee-track { display:flex; white-space:nowrap; animation: marquee 30s linear infinite; }
        a { text-decoration: none; }
        .nav-link:hover { color: #e8e8e6 !important; }
        .vak-card:hover { border-color: #2a2a2a !important; }
        .cta-hero:hover { background: #86efac !important; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-cta { font-size: 12px !important; padding: 6px 14px !important; }
          .hero-section { grid-template-columns: 1fr !important; padding: 36px 1.25rem 28px !important; gap: 0 !important; }
          .preview-card { display: none !important; }
          .hero-badge { font-size: 10px !important; padding: 4px 10px !important; margin-bottom: 16px !important; }
          .hero-h1 { font-size: 32px !important; line-height: 1.15 !important; }
          .hero-p { font-size: 14px !important; margin-bottom: 24px !important; }
          .hero-cta-rij { gap: 10px !important; }
          .stats-bar-grid { grid-template-columns: repeat(3,1fr) !important; padding: 14px 1.25rem !important; }
          .stats-getal { font-size: 18px !important; }
          .sectie-inner { padding: 40px 1.25rem !important; }
          .sectie-kop { font-size: 22px !important; margin-bottom: 28px !important; }
          .stappen-grid { grid-template-columns: repeat(2,1fr) !important; gap: 18px !important; }
          .vakgebieden-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cta-inner { padding: 48px 1.25rem !important; }
          .cta-kop { font-size: 26px !important; }
          .footer-flex { flex-direction: column !important; gap: 6px !important; text-align: center !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 20, color: '#e8e8e6', letterSpacing: '-.2px' }}>◈ Brieft</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div className="nav-links" style={{ display: 'flex', gap: 28 }}>
              <a href="#hoe" className="nav-link" style={{ fontSize: 13, color: '#555', fontWeight: 500, transition: 'color .15s' }}>{t.navHoe}</a>
              <a href="#vakgebieden" className="nav-link" style={{ fontSize: 13, color: '#555', fontWeight: 500, transition: 'color .15s' }}>{t.navVakgebieden}</a>
            </div>
            <Link href="/inschrijven" className="nav-cta" style={{ background: '#4ade80', color: '#0a0a0a', fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, letterSpacing: '-.01em' }}>
              {t.navAanmelden}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem 56px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 56, alignItems: 'center', opacity: visible ? 1 : 0, transition: 'opacity .6s' }}>
        <div>
          <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.18)', color: '#4ade80', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, marginBottom: 24, letterSpacing: '.04em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}></span>
            {t.badge}
          </div>
          <h1 className="hero-h1" style={{ fontFamily: "'DM Serif Display'", fontSize: 50, lineHeight: 1.1, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-.5px', color: '#f0f0ee' }}>
            {t.heroRegel1}
          </h1>
          <h1 className="hero-h1" style={{ fontFamily: "'DM Serif Display'", fontSize: 50, lineHeight: 1.1, fontWeight: 400, margin: '0 0 28px', letterSpacing: '-.5px', color: '#4ade80' }}>
            <span className="rotate" key={current}>{t.vakgebieden[current % t.vakgebieden.length]}</span>
          </h1>
          <p className="hero-p" style={{ fontSize: 16, color: '#666', lineHeight: 1.75, margin: '0 0 36px', maxWidth: 420 }}>
            {t.heroOmschrijving}
          </p>
          <div className="hero-cta-rij" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <Link href="/inschrijven" className="cta-hero" style={{ background: '#4ade80', color: '#0a0a0a', fontSize: 14, fontWeight: 700, padding: '12px 26px', borderRadius: 8, letterSpacing: '-.01em', transition: 'background .15s' }}>
              {t.ctaPrimair}
            </Link>
            <a href="#hoe" style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{t.ctaSecundair}</a>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {t.garanties.map(g => (
              <span key={g} style={{ fontSize: 12, color: '#4ade80', fontWeight: 500 }}>✓ {g}</span>
            ))}
          </div>
        </div>

        {/* Preview card */}
        <div className="preview-card" style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 22, boxShadow: '0 0 0 1px rgba(74,222,128,.05), 0 24px 48px rgba(0,0,0,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s ease-in-out infinite' }}></div>
            <span style={{ fontSize: 11, color: '#444', fontWeight: 500 }}>{t.previewLabel(weekNummer)}</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.12)', color: '#4ade80', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{t.previewUpdates}</span>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', margin: '0 0 14px' }}></div>
          {t.previewItems.map((item, i) => (
            <div key={i} style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderLeft: `2px solid ${i === 0 ? '#4ade80' : '#333'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, opacity: i === 0 ? 1 : 0.5 }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
                <span style={{ background: i === 0 ? 'rgba(248,113,113,.08)' : '#161616', border: `1px solid ${i === 0 ? 'rgba(248,113,113,.15)' : '#222'}`, color: i === 0 ? '#f87171' : '#888', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{item.impact}</span>
                <span style={{ background: '#181818', border: '1px solid #222', color: '#444', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>{item.type}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#c8c8c6', marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', paddingTop: 4, fontSize: 10, color: '#222' }}>· · ·</div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={{ borderTop: '1px solid #141414', borderBottom: '1px solid #141414', background: '#0d0d0d' }}>
        <div className="stats-bar-grid" style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 2rem', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center' }}>
          {t.stats.map((s, i) => (
            <div key={i} style={{ padding: '8px 0', borderRight: i < 2 ? '1px solid #1a1a1a' : 'none' }}>
              <div className="stats-getal" style={{ fontFamily: "'DM Serif Display'", fontSize: 26, color: '#f0f0ee', marginBottom: 4 }}>{s.getal}</div>
              <div style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BRONNEN MARQUEE */}
      <div style={{ background: '#060606', overflow: 'hidden', padding: '12px 0', borderBottom: '1px solid #111' }}>
        <div className="marquee-track">
          {[...BRONNEN, ...BRONNEN].map((b, i) => (
            <span key={i} style={{ fontSize: 10, color: '#252525', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '0 20px' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* HOE HET WERKT */}
      <section id="hoe" style={{ background: '#0d0d0d', borderBottom: '1px solid #141414' }}>
        <div className="sectie-inner" style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>{t.hoeLabel}</div>
          <div className="sectie-kop" style={{ fontFamily: "'DM Serif Display'", fontSize: 32, fontWeight: 400, color: '#f0f0ee', marginBottom: 48, letterSpacing: '-.3px' }}>{t.hoeKop}</div>
          <div className="stappen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }}>
            {t.stappen.map(step => (
              <div key={step.num}>
                <div style={{ display: 'inline-block', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 6, padding: '3px 10px', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Serif Display'", fontSize: 18, color: '#4ade80' }}>{step.num}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d6', marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VAKGEBIEDEN */}
      <section id="vakgebieden" style={{ background: '#0a0a0a' }}>
        <div className="sectie-inner" style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>{t.vakgebiedenLabel}</div>
          <div className="sectie-kop" style={{ fontFamily: "'DM Serif Display'", fontSize: 32, fontWeight: 400, color: '#f0f0ee', marginBottom: 8, letterSpacing: '-.3px' }}>{t.vakgebiedenKop}</div>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 32 }}>{t.vakgebiedenSub}</div>
          <div className="vakgebieden-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {t.velden.map((v, i) => (
              <div key={i} className="vak-card" style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '16px 18px', transition: 'border-color .15s' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: (v as {italic?:boolean}).italic ? '#2a2a2a' : '#d8d8d6', marginBottom: 5, fontStyle: (v as {italic?:boolean}).italic ? 'italic' : 'normal' }}>{v.naam}</div>
                <div style={{ fontSize: 10, color: '#2a2a2a', lineHeight: 1.55, fontStyle: (v as {italic?:boolean}).italic ? 'italic' : 'normal' }}>{v.bronnen}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#0d0d0d', borderTop: '1px solid #141414', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 200, background: 'radial-gradient(ellipse, rgba(74,222,128,.06) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div className="cta-inner" style={{ maxWidth: 560, margin: '0 auto', padding: '80px 2rem', textAlign: 'center', position: 'relative' }}>
          <div className="cta-kop" style={{ fontFamily: "'DM Serif Display'", fontSize: 34, fontWeight: 400, color: '#f0f0ee', margin: '0 0 14px', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            {t.ctaKop}
          </div>
          <p style={{ fontSize: 15, color: '#555', margin: '0 0 32px', lineHeight: 1.65 }}>
            {t.ctaSub}
          </p>
          <Link href="/inschrijven" style={{ display: 'inline-block', background: '#4ade80', color: '#0a0a0a', fontSize: 15, fontWeight: 700, padding: '13px 36px', borderRadius: 9, letterSpacing: '-.01em' }}>
            {t.ctaKnop}
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            {t.ctaGaranties.map(g => (
              <span key={g} style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>✓ {g}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#050505', borderTop: '1px solid #0f0f0f', padding: '24px 2rem' }}>
        <div className="footer-flex" style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 17, color: '#2a2a2a' }}>◈ Brieft</span>
          <span style={{ fontSize: 11, color: '#2a2a2a' }}>{t.footerTagline}</span>
        </div>
      </footer>

    </main>
  )
}
