'use client'
import { useMemo, useState } from 'react'

// Architectuurkaart van de agent-architectuur — interne documentatie in het
// admin-dashboard. Layout geïnspireerd op skilltree.altari.ai (radiale clusters
// rond een centrum), maar in het bestaande Brieft-kleurenschema in plaats van
// SkillTree's eigen palet, zodat het als onderdeel van hetzelfde dashboard voelt.

type Status = 'actief' | 'gepland'

interface AgentNode {
  id: string
  naam: string
  beschrijving: string
  trigger: string
  raakt: string[]
  status: Status
}

interface Domein {
  id: string
  naam: string
  ondertitel: string
  hoek: number // graden, 0 = boven, met de klok mee — bepaalt positie rond het centrum
  kleur: string
  agents: AgentNode[]
}

const DOMEINEN: Domein[] = [
  {
    id: 'content',
    naam: 'CONTENT & REDACTIE',
    ondertitel: 'scout · classificatie · redactie · kwaliteitscontrole',
    hoek: 0,
    kleur: '#4ade80',
    agents: [
      { id: 'scout', naam: 'Scout', beschrijving: 'Haalt ruwe artikelen op uit de RSS-bronnenlijst per vakgebied.', trigger: 'Bij elke verzendrun (wekelijks/maandelijks per abonnee)', raakt: ['lib/fetcher.ts'], status: 'actief' },
      { id: 'classificatie', naam: 'Classificatie', beschrijving: 'Scoort relevantie per artikel voordat de dure redactie-stap begint.', trigger: 'Na scout, binnen dezelfde run', raakt: ['Claude Haiku 4.5'], status: 'actief' },
      { id: 'redactie', naam: 'Redactie', beschrijving: 'Schrijft samenvatting + actie, uitsluitend op basis van de brontekst.', trigger: 'Na classificatie', raakt: ['Claude Sonnet 4.6'], status: 'actief' },
      { id: 'kwaliteitscontrole', naam: 'Kwaliteitscontrole', beschrijving: 'Fact-check per item tegen de bron. Bij twijfel: afkeuren, niet gokken.', trigger: 'Na redactie, per item', raakt: ['Claude Sonnet 4.6'], status: 'actief' },
      { id: 'personalisatie', naam: 'Personalisatie & verzend', beschrijving: 'Bouwt de HTML en verstuurt — alleen goedgekeurde items.', trigger: 'Na kwaliteitscontrole', raakt: ['Resend'], status: 'actief' },
    ],
  },
  {
    id: 'marketing',
    naam: 'MARKETING & GROEI',
    ondertitel: 'onboarding · groeirapport',
    hoek: 90,
    kleur: '#60a5fa',
    agents: [
      { id: 'onboarding', naam: 'Onboarding', beschrijving: 'Dag-3 vervolgmail met vakgebied-context na aanmelding.', trigger: 'Dagelijks, 10:00', raakt: ['subscribers.onboarding_stap'], status: 'actief' },
      { id: 'groeirapport', naam: 'Groeirapport', beschrijving: 'Maandmail: aanmeldingen, opzeggingen, vakgebied-verdeling.', trigger: 'Maandelijks, 1e dag 08:00', raakt: ['subscribers'], status: 'actief' },
      { id: 'social', naam: 'Social content', beschrijving: 'Zet de belangrijkste update van de week om in een conceptpost.', trigger: 'Gepland — nog niet gebouwd', raakt: [], status: 'gepland' },
    ],
  },
  {
    id: 'backoffice',
    naam: 'BACKOFFICE & OPERATIONS',
    ondertitel: 'watchdog · herziening',
    hoek: 180,
    kleur: '#fbbf24',
    agents: [
      { id: 'watchdog', naam: 'Watchdog', beschrijving: 'Leest agent_runs, mailt alleen bij problemen of een stille cron.', trigger: 'Dagelijks, 09:00', raakt: ['agent_runs'], status: 'actief' },
      { id: 'herziening', naam: 'Herziening', beschrijving: 'Checkt gepubliceerde items periodiek opnieuw tegen de bron.', trigger: 'Wekelijks, woensdag 09:00', raakt: ['gepubliceerde_items'], status: 'actief' },
      { id: 'facturatie', naam: 'Facturatie', beschrijving: 'Genereert facturen bij Mollie-betalingen.', trigger: 'Gepland — wacht op KVK/Moneybird-koppeling', raakt: [], status: 'gepland' },
    ],
  },
  {
    id: 'klantenservice',
    naam: 'KLANTENSERVICE',
    ondertitel: 'triage · FAQ — nog niet gebouwd',
    hoek: 270,
    kleur: '#555',
    agents: [
      { id: 'triage', naam: 'Inbox triage', beschrijving: 'Herkent vraag/opzeggen/klacht in binnenkomende mail.', trigger: 'Gepland — wacht op Resend Inbound', raakt: [], status: 'gepland' },
      { id: 'faq', naam: 'FAQ-antwoord', beschrijving: 'Beantwoordt standaardvragen als concept, niet auto-send.', trigger: 'Gepland — wacht op Resend Inbound', raakt: [], status: 'gepland' },
    ],
  },
]

const CX = 500
const CY = 420
const CLUSTER_R = 190
const NODE_R_MIN = 320

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function ArchitectuurMap() {
  const [actief, setActief] = useState<AgentNode | null>(null)

  const layout = useMemo(() => {
    return DOMEINEN.map(domein => {
      const anchor = polar(CX, CY, CLUSTER_R, domein.hoek)
      const spreiding = 44 // graden totale waaier per cluster
      const n = domein.agents.length
      const nodes = domein.agents.map((agent, i) => {
        const offset = n === 1 ? 0 : -spreiding / 2 + (spreiding / (n - 1)) * i
        const hoek = domein.hoek + offset
        const radius = NODE_R_MIN - 20 + (i % 2) * 26
        const pos = polar(CX, CY, radius, hoek)
        return { agent, pos }
      })
      const labelPos = polar(CX, CY, NODE_R_MIN + 40, domein.hoek)
      return { domein, anchor, nodes, labelPos }
    })
  }, [])

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#d8d8d6', margin: 0 }}>Agent-architectuur</h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#555' }}>
          <span><span style={{ color: '#4ade80' }}>●</span> actief</span>
          <span><span style={{ color: '#444' }}>●</span> gepland</span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 1000 840" style={{ width: '100%', height: 'auto', display: 'block', background: '#0a0a0a' }}>
          {/* Verbindingslijnen: centrum -> cluster-anker -> elke node */}
          {layout.map(({ domein, anchor, nodes }) => (
            <g key={domein.id}>
              <line
                x1={CX} y1={CY} x2={anchor.x} y2={anchor.y}
                stroke={domein.kleur} strokeOpacity={0.35} strokeWidth={1}
                strokeDasharray={domein.agents.every(a => a.status === 'gepland') ? '4 4' : undefined}
              />
              {nodes.map(({ agent, pos }) => (
                <line
                  key={agent.id}
                  x1={anchor.x} y1={anchor.y} x2={pos.x} y2={pos.y}
                  stroke={agent.status === 'actief' ? domein.kleur : '#333'}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray={agent.status === 'gepland' ? '3 3' : undefined}
                />
              ))}
            </g>
          ))}

          {/* Centrum: agent_runs, de gedeelde audit trail */}
          <circle cx={CX} cy={CY} r={22} fill="#0a0a0a" stroke="#4ade80" strokeWidth={1.5} />
          <text x={CX} y={CY - 30} textAnchor="middle" fill="#4ade80" fontSize={11} fontFamily="'DM Sans', sans-serif" fontWeight={700} letterSpacing="1px">
            agent_runs
          </text>

          {/* Cluster-ankers */}
          {layout.map(({ domein, anchor }) => (
            <circle key={domein.id} cx={anchor.x} cy={anchor.y} r={7} fill="#0a0a0a" stroke={domein.kleur} strokeWidth={1.5} />
          ))}

          {/* Domeinlabels */}
          {layout.map(({ domein, labelPos }) => (
            <text
              key={domein.id}
              x={labelPos.x} y={labelPos.y}
              textAnchor="middle"
              fill={domein.agents.some(a => a.status === 'actief') ? '#e8e8e6' : '#3a3a3a'}
              fontSize={15}
              fontFamily="'DM Serif Display', serif"
              letterSpacing="2px"
            >
              {domein.naam}
            </text>
          ))}
          {layout.map(({ domein, labelPos }) => (
            <text
              key={domein.id + '-sub'}
              x={labelPos.x} y={labelPos.y + 18}
              textAnchor="middle"
              fill="#333"
              fontSize={10}
              fontFamily="'DM Sans', sans-serif"
            >
              {domein.ondertitel}
            </text>
          ))}

          {/* Agent-nodes */}
          {layout.map(({ domein, nodes }) =>
            nodes.map(({ agent, pos }) => (
              <g
                key={agent.id}
                onClick={() => setActief(agent)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x} cy={pos.y}
                  r={actief?.id === agent.id ? 9 : 6}
                  fill={agent.status === 'actief' ? domein.kleur : '#0a0a0a'}
                  stroke={agent.status === 'actief' ? domein.kleur : '#444'}
                  strokeWidth={1.5}
                  opacity={agent.status === 'actief' ? 1 : 0.7}
                />
                <text
                  x={pos.x}
                  y={pos.y - 14}
                  textAnchor="middle"
                  fill={actief?.id === agent.id ? '#f0f0ee' : '#666'}
                  fontSize={10}
                  fontFamily="'DM Sans', sans-serif"
                  fontWeight={actief?.id === agent.id ? 700 : 500}
                >
                  {agent.naam}
                </text>
              </g>
            ))
          )}
        </svg>

        {/* Detailpaneel */}
        {actief && (
          <div
            style={{
              position: 'absolute', top: 16, right: 16, width: 260,
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 12,
              padding: '16px 18px', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Serif Display'", fontSize: 17, color: '#f0f0ee' }}>{actief.naam}</span>
              <button
                onClick={() => setActief(null)}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}
              >
                ✕
              </button>
            </div>
            <div style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: actief.status === 'actief' ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.05)',
              color: actief.status === 'actief' ? '#4ade80' : '#666', marginBottom: 10,
            }}>
              {actief.status === 'actief' ? 'ACTIEF' : 'GEPLAND'}
            </div>
            <p style={{ fontSize: 12, color: '#999', lineHeight: 1.6, margin: '0 0 10px' }}>{actief.beschrijving}</p>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}><strong style={{ color: '#777' }}>Trigger:</strong> {actief.trigger}</div>
            {actief.raakt.length > 0 && (
              <div style={{ fontSize: 11, color: '#555' }}>
                <strong style={{ color: '#777' }}>Raakt:</strong> {actief.raakt.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
