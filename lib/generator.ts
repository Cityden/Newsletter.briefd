import type { Artikel } from './fetcher'

export interface Voorkeuren {
  stijl: 'kort' | 'uitgebreid'
  regio: string[]
  extraOnderwerpen: string
  alleenHogeImpact: boolean
  taal?: string
}

export interface Profiel {
  naam: string
  vakgebied: string
  branche?: string
  organisatie: string
  land?: string
  voorkeuren?: Voorkeuren
}

export function bepaalTaal(land?: string): string {
  if (!land || land === 'NL') return 'Nederlands'
  const map: Record<string, string> = {
    BE: 'Nederlands', DE: 'Duits', FR: 'Frans', GB: 'Engels',
    IE: 'Engels', US: 'Engels', AT: 'Duits', CH: 'Duits',
    LU: 'Nederlands', ES: 'Spaans', IT: 'Italiaans',
    PL: 'Pools', DK: 'Deens', SE: 'Zweeds', FI: 'Fins',
  }
  return map[land] ?? 'Engels'
}

function bepaalLocale(land?: string): string {
  if (!land || land === 'NL') return 'nl-NL'
  const map: Record<string, string> = {
    BE: 'nl-BE', DE: 'de-DE', FR: 'fr-FR', GB: 'en-GB',
    IE: 'en-IE', US: 'en-US', AT: 'de-AT', CH: 'de-CH',
    LU: 'fr-LU', ES: 'es-ES', IT: 'it-IT',
    PL: 'pl-PL', DK: 'da-DK', SE: 'sv-SE', FI: 'fi-FI',
  }
  return map[land] ?? 'en-GB'
}

function bepaalHtmlLang(land?: string): string {
  if (!land || land === 'NL') return 'nl'
  const map: Record<string, string> = {
    BE: 'nl', DE: 'de', FR: 'fr', GB: 'en',
    IE: 'en', US: 'en', AT: 'de', CH: 'de',
    LU: 'fr', ES: 'es', IT: 'it',
    PL: 'pl', DK: 'da', SE: 'sv', FI: 'fi',
  }
  return map[land] ?? 'en'
}

export function uitlegVakgebied(vakgebied: string): string {
  const v = vakgebied.toLowerCase()
  if (v.includes('fiscal') || v.includes('belasting') || v.includes('vpb') || v.includes('btw') || v.includes('tax'))
    return 'fiscaal recht, belastingwetgeving, btw, vennootschapsbelasting, inkomstenbelasting'
  if (v.includes('financ') || v.includes('boekhoud') || v.includes('accoun') || v.includes('controller') || v.includes('cfo') || v.includes('audit') || v.includes('treasury'))
    return 'financieel toezicht, boekhoud- en verslaggevingsregels, kapitaalmarkten, jaarrekening, compliance'
  if (v.includes('hr ') || v.includes(' hr') || v === 'hr' || v.includes('human resource') || v.includes('personeel') || v.includes('arbeid') || v.includes('cao') || v.includes('recrut') || v.includes('talent'))
    return 'arbeidsrecht, personeelsbeleid, cao-regelgeving, sociale zekerheid, ontslagrecht, loondoorbetaling'
  if (v.includes('privacy') || v.includes('avg') || v.includes('gdpr') || v.includes('data protec') || v.includes('persoonsgegevens') || v.includes('dpo'))
    return 'privacywetgeving, AVG/GDPR, gegevensbescherming, datalekken, toezicht Autoriteit Persoonsgegevens'
  if (v.includes('compliance') || v.includes('legal') || v.includes('juridisch') || v.includes('jurist') || v.includes('counsel') || v.includes('recht'))
    return 'wet- en regelgeving, juridische compliance, toezicht, handhaving, bestuursrecht'
  if (v.includes('marketing') || v.includes('reclame') || v.includes('communicat') || v.includes('consument') || v.includes('brand') || v.includes('campagne'))
    return 'reclamewetgeving, consumentenbescherming, mededingingsrecht, ACM-toezicht, cookiewetgeving'
  if (v.includes('it') || v.includes('ict') || v.includes('cyber') || v.includes('software') || v.includes('tech') || v.includes('digital') || v.includes('ciso') || v.includes('cto') || v.includes('infra'))
    return 'cybersecurity, digitalisering, NIS2, informatiebeveiliging, softwarewetgeving, AI-regelgeving'
  if (v.includes('esg') || v.includes('duurzaam') || v.includes('milieu') || v.includes('klimaat') || v.includes('sustainab') || v.includes('csrd') || v.includes('impact'))
    return 'ESG-regelgeving, duurzaamheidsrapportage, CSRD, klimaatbeleid, milieurecht'
  if (v.includes('zorg') || v.includes('medisch') || v.includes('gezondheid') || v.includes('pharma') || v.includes('care') || v.includes('klinisch'))
    return 'zorgwetgeving, Wkkgz, zorginkoop, NZa-toezicht, geneesmiddelenbeleid'
  if (v.includes('inkoop') || v.includes('aanbesteding') || v.includes('procurement') || v.includes('supply') || v.includes('logistiek') || v.includes('operati'))
    return 'aanbestedingsrecht, inkoopbeleid, supply chain regelgeving, Europese aanbestedingsrichtlijnen'
  return 'algemene wet- en regelgeving, overheidsbeleid, compliance'
}

export async function genereerNieuwsbrief(
  artikelen: Artikel[],
  profiel: Profiel,
  beheerUrl: string
): Promise<{ onderwerp: string; html: string } | null> {

  if (artikelen.length === 0) return null

  const artikelTekst = artikelen.map((a, i) =>
    `[${i + 1}] TITEL: ${a.titel}
BRON: ${a.bron}
URL: ${a.url}
DATUM: ${a.gepubliceerdOp}
SAMENVATTING: ${a.samenvatting}`
  ).join('\n\n---\n\n')

  const orgLabel: Record<string, string> = {
    zzp: 'ZZP\'er',
    mkb: 'MKB-bedrijf (10–250 medewerkers)',
    groot: 'groot bedrijf (250+ medewerkers)',
    overheid: 'overheids- of non-profitorganisatie',
  }

  // Vertaal vakgebied (kan een functietitel zijn) naar domeinbeschrijving voor Claude
  const vakgebiedContext = uitlegVakgebied(profiel.vakgebied)
  const taal = profiel.voorkeuren?.taal || bepaalTaal(profiel.land)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `Je bent een juridisch redacteur die regelgevingsupdates schrijft voor professionals. Schrijf alle tekstuele content (onderwerp, titel, samenvatting, actie) in het ${taal}. De JSON-sleutels en vaste waarden (impact: "hoog"/"gemiddeld"/"laag", type: "wetgeving"/"uitspraak"/"beleid"/"tarief") blijven altijd exact zoals hieronder gespecificeerd, ongeacht de taal.

KRITIEKE OUTPUTREGEL: Je antwoord bestaat UITSLUITEND uit één geldig JSON-object. Begin direct met { en eindig met }. Geen inleiding, geen uitleg, geen tekst buiten de JSON — ook niet als je weinig relevants vindt.

SELECTIEREGELS:
1. Schrijf alleen over wat letterlijk in de aangeleverde bronnen staat
2. Selecteer MINIMAAL 2 en maximaal 6 items — ook als de relevantie indirect is
3. Interpreteer relevantie ruim: rechterlijke uitspraken, wetgeving, beleid of overheidsbesluiten die het vakgebied ook zijdelings raken tellen mee
4. Als bronnen schaars zijn: kies de meest aanverwante items — nooit een lege array retourneren
5. Elke bronUrl moet een exacte URL zijn uit de aangeleverde lijst

JSON-STRUCTUUR:
{
  "onderwerp": "e-mailonderwerp max 60 tekens",
  "items": [
    {
      "titel": "duidelijke titel",
      "impact": "hoog" of "gemiddeld" of "laag",
      "type": "wetgeving" of "uitspraak" of "beleid" of "tarief",
      "samenvatting": "2-3 zinnen wat dit betekent voor de ontvanger",
      "actie": "concrete actie in 1 zin",
      "bronUrl": "exacte URL uit de lijst",
      "bronNaam": "naam van de bron",
      "datum": "publicatiedatum",
      "vergelijkingstabel": null
    }
  ]
}`,
      messages: [{
        role: 'user',
        content: `Ontvanger: ${saniteerVoorPrompt(profiel.naam)}
Vakgebied: ${saniteerVoorPrompt(profiel.vakgebied)}${vakgebiedContext ? ` (${vakgebiedContext})` : ''}
${profiel.branche ? `Branche: ${saniteerVoorPrompt(profiel.branche)}` : ''}
Organisatie: ${orgLabel[profiel.organisatie] ?? profiel.organisatie}
${profiel.voorkeuren ? `Schrijfstijl: ${profiel.voorkeuren.stijl === 'kort' ? 'kort en bondig, max 3 zinnen per item' : 'uitgebreid met context en achtergrond'}
Regio focus: ${profiel.voorkeuren.regio.join(', ')}
Extra onderwerpen om op te letten: ${saniteerVoorPrompt(profiel.voorkeuren.extraOnderwerpen || 'geen')}
Alleen hoge impact: ${profiel.voorkeuren.alleenHogeImpact ? 'ja, filter laag en gemiddeld weg' : 'nee, alle relevante updates'}` : ''}

Selecteer minimaal 2 items. Retourneer ALLEEN het JSON-object, geen andere tekst.

${artikelTekst}`
      }]
    })
  })

  const data = await response.json()
  if (data.error || !data.content) {
    console.error(`[generator] Anthropic API fout:`, JSON.stringify(data).slice(0, 500))
    return null
  }
  const tekst = data.content?.[0]?.text ?? ''
  console.log(`[generator] Claude response (eerste 300 tekens): ${tekst.slice(0, 300)}`)

  let parsed: {
    onderwerp: string
    items: {
      titel: string
      impact: string
      type: string
      samenvatting: string
      actie: string
      bronUrl: string
      bronNaam: string
      datum: string
      vergelijkingstabel: { aspect: string; oud: string; nieuw: string }[] | null
    }[]
  }

  try {
    const clean = tekst.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch (err) {
    console.error(`[generator] JSON parse mislukt:`, err, `\nTekst: ${tekst.slice(0, 300)}`)
    return null
  }

  console.log(`[generator] Items gevonden: ${parsed.items?.length ?? 0}`)
  if (!parsed.items?.length) return null

  const impactVolgorde: Record<string, number> = { hoog: 0, gemiddeld: 1, laag: 2 }
  parsed.items.sort((a: { impact: string }, b: { impact: string }) =>
    (impactVolgorde[a.impact] ?? 1) - (impactVolgorde[b.impact] ?? 1)
  )

  const html = buildHTML(parsed, profiel, beheerUrl, taal)
  return { onderwerp: parsed.onderwerp, html }
}

export function saniteerVoorPrompt(str: string): string {
  // Verwijder newlines en voorkom prompt injection via gebruikersinput
  return str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface UiTeksten {
  headerLabel: string
  updatesLabel: (n: number) => string
  impactHoog: string
  impactGemiddeld: string
  impactLaag: string
  typeWetgeving: string
  typeUitspraak: string
  typeBeleid: string
  typeTarief: string
  tabelOnderdeel: string
  tabelOud: string
  tabelNieuw: string
  actieLabel: string
  bronLabel: string
  voorkeurenKnop: string
  footerTekst: (vakgebied: string) => string
  uitschrijven: string
}

const UI: Record<string, UiTeksten> = {
  Nederlands: {
    headerLabel:    'Regelgeving nieuwsbrief',
    updatesLabel:   n => `${n} update${n !== 1 ? 's' : ''} deze week`,
    impactHoog:     'Hoge impact',
    impactGemiddeld:'Gemiddelde impact',
    impactLaag:     'Lage impact',
    typeWetgeving:  'Wetgeving',
    typeUitspraak:  'Uitspraak',
    typeBeleid:     'Beleid',
    typeTarief:     'Tariefwijziging',
    tabelOnderdeel: 'Onderdeel',
    tabelOud:       'Oud',
    tabelNieuw:     'Nieuw',
    actieLabel:     'Actie',
    bronLabel:      'Bron',
    voorkeurenKnop: 'Voorkeuren wijzigen',
    footerTekst:    v => `Je ontvangt deze nieuwsbrief omdat je je hebt aangemeld voor updates over <strong>${v}</strong>.`,
    uitschrijven:   'Uitschrijven',
  },
  Engels: {
    headerLabel:    'Regulatory newsletter',
    updatesLabel:   n => `${n} update${n !== 1 ? 's' : ''} this week`,
    impactHoog:     'High impact',
    impactGemiddeld:'Medium impact',
    impactLaag:     'Low impact',
    typeWetgeving:  'Legislation',
    typeUitspraak:  'Court ruling',
    typeBeleid:     'Policy',
    typeTarief:     'Rate change',
    tabelOnderdeel: 'Item',
    tabelOud:       'Before',
    tabelNieuw:     'After',
    actieLabel:     'Action',
    bronLabel:      'Source',
    voorkeurenKnop: 'Manage preferences',
    footerTekst:    v => `You are receiving this newsletter because you subscribed to updates on <strong>${v}</strong>.`,
    uitschrijven:   'Unsubscribe',
  },
  Duits: {
    headerLabel:    'Regulierungs-Newsletter',
    updatesLabel:   n => `${n} Update${n !== 1 ? 's' : ''} diese Woche`,
    impactHoog:     'Hohe Auswirkung',
    impactGemiddeld:'Mittlere Auswirkung',
    impactLaag:     'Geringe Auswirkung',
    typeWetgeving:  'Gesetzgebung',
    typeUitspraak:  'Gerichtsurteil',
    typeBeleid:     'Politik',
    typeTarief:     'Tarifänderung',
    tabelOnderdeel: 'Bereich',
    tabelOud:       'Vorher',
    tabelNieuw:     'Nachher',
    actieLabel:     'Maßnahme',
    bronLabel:      'Quelle',
    voorkeurenKnop: 'Einstellungen verwalten',
    footerTekst:    v => `Sie erhalten diesen Newsletter, weil Sie Updates zu <strong>${v}</strong> abonniert haben.`,
    uitschrijven:   'Abmelden',
  },
  Frans: {
    headerLabel:    'Newsletter réglementaire',
    updatesLabel:   n => `${n} mise${n !== 1 ? 's' : ''} à jour cette semaine`,
    impactHoog:     'Impact élevé',
    impactGemiddeld:'Impact moyen',
    impactLaag:     'Faible impact',
    typeWetgeving:  'Législation',
    typeUitspraak:  'Décision judiciaire',
    typeBeleid:     'Politique',
    typeTarief:     'Changement de taux',
    tabelOnderdeel: 'Élément',
    tabelOud:       'Avant',
    tabelNieuw:     'Après',
    actieLabel:     'Action',
    bronLabel:      'Source',
    voorkeurenKnop: 'Gérer les préférences',
    footerTekst:    v => `Vous recevez cette newsletter car vous êtes abonné(e) aux mises à jour sur <strong>${v}</strong>.`,
    uitschrijven:   'Se désabonner',
  },
  Spaans: {
    headerLabel:    'Boletín regulatorio',
    updatesLabel:   n => `${n} actualización${n !== 1 ? 'es' : ''} esta semana`,
    impactHoog:     'Alto impacto',
    impactGemiddeld:'Impacto medio',
    impactLaag:     'Bajo impacto',
    typeWetgeving:  'Legislación',
    typeUitspraak:  'Sentencia',
    typeBeleid:     'Política',
    typeTarief:     'Cambio de tarifa',
    tabelOnderdeel: 'Elemento',
    tabelOud:       'Antes',
    tabelNieuw:     'Después',
    actieLabel:     'Acción',
    bronLabel:      'Fuente',
    voorkeurenKnop: 'Gestionar preferencias',
    footerTekst:    v => `Recibe este boletín porque se suscribió a actualizaciones sobre <strong>${v}</strong>.`,
    uitschrijven:   'Cancelar suscripción',
  },
  Italiaans: {
    headerLabel:    'Newsletter normativa',
    updatesLabel:   n => `${n} aggiornament${n !== 1 ? 'i' : 'o'} questa settimana`,
    impactHoog:     'Alto impatto',
    impactGemiddeld:'Impatto medio',
    impactLaag:     'Basso impatto',
    typeWetgeving:  'Legislazione',
    typeUitspraak:  'Sentenza',
    typeBeleid:     'Politica',
    typeTarief:     'Modifica tariffaria',
    tabelOnderdeel: 'Elemento',
    tabelOud:       'Prima',
    tabelNieuw:     'Dopo',
    actieLabel:     'Azione',
    bronLabel:      'Fonte',
    voorkeurenKnop: 'Gestisci preferenze',
    footerTekst:    v => `Ricevi questa newsletter perché ti sei iscritto agli aggiornamenti su <strong>${v}</strong>.`,
    uitschrijven:   'Annulla iscrizione',
  },
}

function getTeksten(taal: string): UiTeksten {
  return UI[taal] ?? UI['Engels']
}

function impactKleur(impact: string, t: UiTeksten) {
  if (impact === 'hoog') return { bg: '#FCEBEB', kleur: '#791F1F', label: t.impactHoog }
  if (impact === 'gemiddeld') return { bg: '#FAEEDA', kleur: '#633806', label: t.impactGemiddeld }
  return { bg: '#EAF3DE', kleur: '#27500A', label: t.impactLaag }
}

function typeLabel(type: string, t: UiTeksten) {
  const map: Record<string, string> = {
    wetgeving: t.typeWetgeving,
    uitspraak: t.typeUitspraak,
    beleid:    t.typeBeleid,
    tarief:    t.typeTarief,
  }
  return map[type] ?? type
}

export function buildHTML(
  data: ReturnType<typeof JSON.parse>,
  profiel: Profiel,
  beheerUrl: string,
  taal: string
): string {
  const t = getTeksten(taal)
  const locale = bepaalLocale(profiel.land)
  const datum = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  const items = data.items.map((item: {
    impact: string; type: string; titel: string; datum: string;
    samenvatting: string; actie: string; bronUrl: string; bronNaam: string;
    vergelijkingstabel: { aspect: string; oud: string; nieuw: string }[] | null
  }) => {
    const ic = impactKleur(item.impact, t)
    const tabel = item.vergelijkingstabel?.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">${t.tabelOnderdeel}</th>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">${t.tabelOud}</th>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">${t.tabelNieuw}</th>
          </tr>
        </thead>
        <tbody>
          ${item.vergelijkingstabel.map((r: { aspect: string; oud: string; nieuw: string }) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f5f5f5;color:#333">${r.aspect}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f5f5f5;color:#999;text-decoration:line-through">${r.oud}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f5f5f5;color:#27500A;font-weight:500">${r.nieuw}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''

    return `
    <div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <span style="background:${ic.bg};color:${ic.kleur};font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px">${ic.label}</span>
        <span style="background:#EEEDFE;color:#3C3489;font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px">${typeLabel(item.type, t)}</span>
        <span style="margin-left:auto;font-size:11px;color:#aaa">${item.datum}</span>
      </div>
      <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:8px;line-height:1.3">${item.titel}</div>
      <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:10px">${item.samenvatting}</div>
      ${tabel}
      <div style="background:#EEEDFE;border-radius:8px;padding:10px 14px;font-size:13px;color:#3C3489;margin-bottom:12px">
        <strong>${t.actieLabel}:</strong> ${item.actie}
      </div>
      <div style="font-size:11px;color:#aaa">
        ${t.bronLabel}: <a href="${item.bronUrl}" style="color:#534AB7;text-decoration:none">${item.bronNaam}</a>
        &nbsp;·&nbsp;<a href="${item.bronUrl}" style="color:#534AB7;text-decoration:none">${item.bronUrl}</a>
      </div>
    </div>`
  }).join('')

  const htmlLang = bepaalHtmlLang(profiel.land)
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:500;color:#534AB7;margin-bottom:4px">${t.headerLabel}</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${escapeHtml(profiel.vakgebied)}</div>
      <div style="font-size:13px;color:#aaa">${datum} · ${t.updatesLabel(data.items.length)}</div>
    </div>

    <!-- Items -->
    ${items}

    <!-- Footer -->
    <div style="border-top:1px solid #e5e5e5;margin-top:24px;padding-top:20px;text-align:center">
      <a href="${beheerUrl}" style="display:inline-block;background:#534AB7;color:#fff;font-size:14px;font-weight:500;padding:10px 24px;border-radius:8px;text-decoration:none;margin-bottom:16px">
        ${t.voorkeurenKnop}
      </a>
      <div style="font-size:12px;color:#aaa;line-height:1.6">
        ${t.footerTekst(escapeHtml(profiel.vakgebied))}<br>
        <a href="${beheerUrl}?uitschrijven=1" style="color:#aaa">${t.uitschrijven}</a>
      </div>
    </div>

  </div>
</body>
</html>`
}
