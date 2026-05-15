'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const VAKGEBIEDEN = ['Finance', 'HR & Arbeidsrecht', 'Fiscaal', 'Marketing', 'Privacy & AVG', 'IT & Cybersecurity', 'ESG', 'Inkoop']
const BRONNEN = ['Staatscourant', 'AFM', 'DNB', 'Rechtspraak.nl', 'Autoriteit Persoonsgegevens', 'NCSC', 'ACM', 'EUR-Lex', 'Belastingdienst', 'SZW', 'UWV', 'RVO', 'Europees Parlement']

export default function HomePage() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const iv = setInterval(() => setCurrent(c => (c + 1) % VAKGEBIEDEN.length), 2200)
    return () => clearInterval(iv)
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
          .hero-section { grid-template-columns: 1fr !important; padding: 40px 1.25rem 32px !important; }
          .preview-card { display: none !important; }
          .hero-h1 { font-size: 36px !important; }
          .stats-bar-grid { grid-template-columns: 1fr !important; }
          .stats-bar-grid > div { border-right: none !important; border-bottom: 1px solid #1a1a1a; }
          .stappen-grid { grid-template-columns: repeat(2,1fr) !important; gap: 20px !important; }
          .vakgebieden-grid { grid-template-columns: repeat(2,1fr) !important; }
          .footer-flex { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 20, color: '#e8e8e6', letterSpacing: '-.2px' }}>◈ Brieft</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#hoe" className="nav-link" style={{ fontSize: 13, color: '#555', fontWeight: 500, transition: 'color .15s' }}>Hoe het werkt</a>
            <a href="#vakgebieden" className="nav-link" style={{ fontSize: 13, color: '#555', fontWeight: 500, transition: 'color .15s' }}>Vakgebieden</a>
            <Link href="/inschrijven" style={{ background: '#4ade80', color: '#0a0a0a', fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, letterSpacing: '-.01em' }}>
              Aanmelden →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem 56px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 56, alignItems: 'center', opacity: visible ? 1 : 0, transition: 'opacity .6s' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.18)', color: '#4ade80', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, marginBottom: 24, letterSpacing: '.04em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}></span>
            AI-gestuurde regelgeving updates
          </div>
          <h1 className="hero-h1" style={{ fontFamily: "'DM Serif Display'", fontSize: 50, lineHeight: 1.1, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-.5px', color: '#f0f0ee' }}>
            Altijd op de hoogte van
          </h1>
          <h1 className="hero-h1" style={{ fontFamily: "'DM Serif Display'", fontSize: 50, lineHeight: 1.1, fontWeight: 400, margin: '0 0 28px', letterSpacing: '-.5px', color: '#4ade80' }}>
            <span className="rotate" key={current}>{VAKGEBIEDEN[current]}</span>
          </h1>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, margin: '0 0 36px', maxWidth: 420 }}>
            Brieft leest wekelijks alle officiële wetgeving, uitspraken en beleidsupdates.
            Jij krijgt alleen wat relevant is — samengevat, met bronverwijzingen.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <Link href="/inschrijven" className="cta-hero" style={{ background: '#4ade80', color: '#0a0a0a', fontSize: 14, fontWeight: 700, padding: '12px 26px', borderRadius: 8, letterSpacing: '-.01em', transition: 'background .15s' }}>
              Gratis aanmelden →
            </Link>
            <a href="#hoe" style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Hoe het werkt</a>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {['Geen spam', 'Altijd uitschrijven', 'Alleen officiële bronnen'].map(t => (
              <span key={t} style={{ fontSize: 12, color: '#4ade80', fontWeight: 500 }}>✓ {t}</span>
            ))}
          </div>
        </div>

        {/* Preview card */}
        <div className="preview-card" style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 22, boxShadow: '0 0 0 1px rgba(74,222,128,.05), 0 24px 48px rgba(0,0,0,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s ease-in-out infinite' }}></div>
            <span style={{ fontSize: 11, color: '#444', fontWeight: 500 }}>Brieft · jouw vakgebied · week 17</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.12)', color: '#4ade80', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>2 updates</span>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', margin: '0 0 14px' }}></div>
          {[
            {
              impact: 'Hoge impact',
              impactColor: '#f87171',
              impactBg: 'rgba(248,113,113,.08)',
              impactBorder: 'rgba(248,113,113,.15)',
              type: 'Wetgeving',
              title: 'Nieuwe meldplicht datalekken — strengere termijn',
              desc: 'Organisaties moeten datalekken voortaan binnen 48 uur melden bij de toezichthouder. Eerder gold 72 uur. Geldt voor alle sectoren.',
              accent: '#4ade80',
              opacity: 1,
            },
            {
              impact: 'Gemiddeld',
              impactColor: '#888',
              impactBg: '#161616',
              impactBorder: '#222',
              type: 'Uitspraak',
              title: 'Rechter: mondeling contract ook bindend bij opdrachten boven €10k',
              desc: 'Hoge Raad bevestigt dat schriftelijk contract niet altijd vereist is, ook bij hogere bedragen...',
              accent: '#333',
              opacity: 0.5,
            },
          ].map((item, i) => (
            <div key={i} style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderLeft: `2px solid ${item.accent}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, opacity: item.opacity }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
                <span style={{ background: item.impactBg, border: `1px solid ${item.impactBorder}`, color: item.impactColor, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{item.impact}</span>
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
          {[
            { getal: '30+', label: 'Officiële bronnen gemonitord' },
            { getal: 'Wekelijks', label: 'Elke maandag bijgewerkt' },
            { getal: '100%', label: 'Primaire overheidsbronnen' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 0', borderRight: i < 2 ? '1px solid #1a1a1a' : 'none' }}>
              <div style={{ fontFamily: "'DM Serif Display'", fontSize: 26, color: '#f0f0ee', marginBottom: 4 }}>{s.getal}</div>
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
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>Hoe het werkt</div>
          <div style={{ fontFamily: "'DM Serif Display'", fontSize: 32, fontWeight: 400, color: '#f0f0ee', marginBottom: 48, letterSpacing: '-.3px' }}>Van officiële bron tot jouw inbox</div>
          <div className="stappen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }}>
            {[
              { num: '01', title: 'Jij vult in wat relevant is', desc: 'Vakgebied, organisatietype, extra voorkeuren en hoe vaak je updates wil.' },
              { num: '02', title: 'Brieft leest de bronnen', desc: 'Staatscourant, rechtspraak.nl, toezichthouders — alleen primaire overheidsbronnen.' },
              { num: '03', title: 'AI filtert en schrijft', desc: 'Relevante updates samengevat met praktijkvoorbeelden afgestemd op jouw profiel.' },
              { num: '04', title: 'Jij leest in 5 minuten', desc: 'Kort overzicht in je inbox. Klik door voor het volledige detail en de bronlink.' },
            ].map(step => (
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
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>Vakgebieden</div>
          <div style={{ fontFamily: "'DM Serif Display'", fontSize: 32, fontWeight: 400, color: '#f0f0ee', marginBottom: 8, letterSpacing: '-.3px' }}>Voor elk vakgebied</div>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 32 }}>Staat jouw vakgebied er niet bij? Typ het gewoon in — Brieft bepaalt zelf welke bronnen relevant zijn.</div>
          <div className="vakgebieden-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { naam: 'Fiscaal', bronnen: 'Belastingdienst · Staatscourant · Rechtspraak' },
              { naam: 'Finance', bronnen: 'AFM · DNB · EUR-Lex' },
              { naam: 'HR & Arbeidsrecht', bronnen: 'Rechtspraak · SZW · UWV' },
              { naam: 'Marketing', bronnen: 'ACM · AP · Reclame Code Commissie' },
              { naam: 'Privacy & AVG', bronnen: 'Autoriteit Persoonsgegevens · EUR-Lex' },
              { naam: 'IT & Cybersecurity', bronnen: 'NCSC · AP · ACM' },
              { naam: 'ESG & Duurzaamheid', bronnen: 'AFM · RVO · EUR-Lex' },
              { naam: 'Jouw vakgebied…', bronnen: 'Brieft zoekt automatisch de juiste bronnen', italic: true },
            ].map((v, i) => (
              <div key={i} className="vak-card" style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '16px 18px', transition: 'border-color .15s' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: v.italic ? '#2a2a2a' : '#d8d8d6', marginBottom: 5, fontStyle: v.italic ? 'italic' : 'normal' }}>{v.naam}</div>
                <div style={{ fontSize: 10, color: '#2a2a2a', lineHeight: 1.55, fontStyle: v.italic ? 'italic' : 'normal' }}>{v.bronnen}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#0d0d0d', borderTop: '1px solid #141414', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 200, background: 'radial-gradient(ellipse, rgba(74,222,128,.06) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 2rem', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontFamily: "'DM Serif Display'", fontSize: 34, fontWeight: 400, color: '#f0f0ee', margin: '0 0 14px', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            Klaar om bij te blijven?
          </div>
          <p style={{ fontSize: 15, color: '#555', margin: '0 0 32px', lineHeight: 1.65 }}>
            Meld je aan en ontvang je eerste gepersonaliseerde nieuwsbrief volgende week.
          </p>
          <Link href="/inschrijven" style={{ display: 'inline-block', background: '#4ade80', color: '#0a0a0a', fontSize: 15, fontWeight: 700, padding: '13px 36px', borderRadius: 9, letterSpacing: '-.01em' }}>
            Gratis aanmelden →
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            {['Geen betaalgegevens', 'Direct opzegbaar', 'Gratis'].map(t => (
              <span key={t} style={{ fontSize: 11, color: '#333', fontWeight: 500 }}>✓ {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#050505', borderTop: '1px solid #0f0f0f', padding: '24px 2rem' }}>
        <div className="footer-flex" style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'DM Serif Display'", fontSize: 17, color: '#2a2a2a' }}>◈ Brieft</span>
          <span style={{ fontSize: 11, color: '#2a2a2a' }}>Alleen officiële Nederlandse en EU-bronnen</span>
        </div>
      </footer>

    </main>
  )
}
