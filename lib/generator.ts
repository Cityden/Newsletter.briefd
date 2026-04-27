import type { Artikel } from './fetcher'

interface Voorkeuren {
  stijl: 'kort' | 'uitgebreid'
  regio: string[]
  extraOnderwerpen: string
  alleenHogeImpact: boolean
}

interface Profiel {
  naam: string
  vakgebied: string
  organisatie: string
  voorkeuren?: Voorkeuren
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Je bent een juridisch redacteur die wekelijkse regelgevingsupdates schrijft voor professionals.

REGELS:
1. Schrijf ALLEEN over wat letterlijk in de aangeleverde bronnen staat
2. Verzin geen feiten, cijfers of uitspraken die niet in de bronnen staan
3. Als een artikel niet relevant is voor het vakgebied en organisatietype: laat het weg
4. Elke bronvermelding moet een exacte URL bevatten uit de aangeleverde lijst
5. Als er niets relevant is: retourneer exact de tekst GEEN_UPDATES

FORMAAT: Retourneer een JSON-object met:
- "onderwerp": e-mailonderwerp (max 60 tekens)
- "items": array van relevante items, elk met:
  - "titel": duidelijke titel
  - "impact": "hoog" | "gemiddeld" | "laag"
  - "type": "wetgeving" | "uitspraak" | "beleid" | "tarief"
  - "samenvatting": 2-3 zinnen in begrijpelijk Nederlands
  - "actie": concrete actie voor de ontvanger (1 zin)
  - "bronUrl": exacte URL uit de aangeleverde bronnen
  - "bronNaam": naam van de bron
  - "datum": publicatiedatum
  - "vergelijkingstabel": null OF array van rijen [{aspect, oud, nieuw}] — ALLEEN invullen als er concrete cijfers/tarieven veranderen`,
      messages: [{
        role: 'user',
        content: `Ontvanger: ${profiel.naam}
Vakgebied: ${profiel.vakgebied}
Organisatie: ${orgLabel[profiel.organisatie] ?? profiel.organisatie}
${profiel.voorkeuren ? `Schrijfstijl: ${profiel.voorkeuren.stijl === 'kort' ? 'kort en bondig, max 3 zinnen per item' : 'uitgebreid met context en achtergrond'}
Regio focus: ${profiel.voorkeuren.regio.join(', ')}
Extra onderwerpen om op te letten: ${profiel.voorkeuren.extraOnderwerpen || 'geen'}
Alleen hoge impact: ${profiel.voorkeuren.alleenHogeImpact ? 'ja, filter laag en gemiddeld weg' : 'nee, alle relevante updates'}` : ''}

Hieronder de publicaties van deze week. Selecteer wat relevant is en schrijf de nieuwsbrief.

${artikelTekst}`
      }]
    })
  })

  const data = await response.json()
  const tekst = data.content?.[0]?.text ?? ''

  if (tekst.trim() === 'GEEN_UPDATES') return null

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
  } catch {
    return null
  }

  if (!parsed.items?.length) return null

  const html = buildHTML(parsed, profiel, beheerUrl)
  return { onderwerp: parsed.onderwerp, html }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function impactKleur(impact: string) {
  if (impact === 'hoog') return { bg: '#FCEBEB', kleur: '#791F1F', label: 'Hoge impact' }
  if (impact === 'gemiddeld') return { bg: '#FAEEDA', kleur: '#633806', label: 'Gemiddelde impact' }
  return { bg: '#EAF3DE', kleur: '#27500A', label: 'Lage impact' }
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    wetgeving: 'Wetgeving', uitspraak: 'Uitspraak',
    beleid: 'Beleid', tarief: 'Tariefwijziging',
  }
  return map[type] ?? type
}

function buildHTML(
  data: ReturnType<typeof JSON.parse>,
  profiel: Profiel,
  beheerUrl: string
): string {
  const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  const items = data.items.map((item: {
    impact: string; type: string; titel: string; datum: string;
    samenvatting: string; actie: string; bronUrl: string; bronNaam: string;
    vergelijkingstabel: { aspect: string; oud: string; nieuw: string }[] | null
  }) => {
    const ic = impactKleur(item.impact)
    const tabel = item.vergelijkingstabel?.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">Onderdeel</th>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">Oud</th>
            <th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:500;color:#888;border-bottom:1px solid #eee">Nieuw</th>
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
        <span style="background:#EEEDFE;color:#3C3489;font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px">${typeLabel(item.type)}</span>
        <span style="margin-left:auto;font-size:11px;color:#aaa">${item.datum}</span>
      </div>
      <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:8px;line-height:1.3">${item.titel}</div>
      <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:10px">${item.samenvatting}</div>
      ${tabel}
      <div style="background:#EEEDFE;border-radius:8px;padding:10px 14px;font-size:13px;color:#3C3489;margin-bottom:12px">
        <strong>Actie:</strong> ${item.actie}
      </div>
      <div style="font-size:11px;color:#aaa">
        Bron: <a href="${item.bronUrl}" style="color:#534AB7;text-decoration:none">${item.bronNaam}</a>
        &nbsp;·&nbsp;<a href="${item.bronUrl}" style="color:#534AB7;text-decoration:none">${item.bronUrl}</a>
      </div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:500;color:#534AB7;margin-bottom:4px">Regelgeving nieuwsbrief</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${escapeHtml(profiel.vakgebied)}</div>
      <div style="font-size:13px;color:#aaa">${datum} · ${data.items.length} update${data.items.length !== 1 ? 's' : ''} deze week</div>
    </div>

    <!-- Items -->
    ${items}

    <!-- Footer -->
    <div style="border-top:1px solid #e5e5e5;margin-top:24px;padding-top:20px;text-align:center">
      <a href="${beheerUrl}" style="display:inline-block;background:#534AB7;color:#fff;font-size:14px;font-weight:500;padding:10px 24px;border-radius:8px;text-decoration:none;margin-bottom:16px">
        Voorkeuren wijzigen
      </a>
      <div style="font-size:12px;color:#aaa;line-height:1.6">
        Je ontvangt deze nieuwsbrief omdat je je hebt aangemeld voor updates over <strong>${escapeHtml(profiel.vakgebied)}</strong>.<br>
        <a href="${beheerUrl}?uitschrijven=1" style="color:#aaa">Uitschrijven</a>
      </div>
    </div>

  </div>
</body>
</html>`
}
