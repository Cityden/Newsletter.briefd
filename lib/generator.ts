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

function uitlegVakgebied(vakgebied: string): string {
  const v = vakgebied.toLowerCase()
  if (v.includes('fiscal') || v.includes('belasting') || v.includes('vpb') || v.includes('btw') || v.includes('tax'))
    return 'fiscaal recht, belastingwetgeving, btw, vennootschapsbelasting, inkomstenbelasting'
  if (v.includes('financ') || v.includes('boekhoud') || v.includes('accoun') || v.includes('afm') || v.includes('controller'))
    return 'financieel toezicht, boekhoud- en verslaggevingsregels, kapitaalmarkten, compliance'
  if (v.includes('hr') || v.includes('human resource') || v.includes('personeels') || v.includes('arbeid') || v.includes('cao') || v.includes('loondienst'))
    return 'arbeidsrecht, personeelsbeleid, cao-regelgeving, sociale zekerheid, ontslagrecht, loondoorbetaling'
  if (v.includes('privacy') || v.includes('avg') || v.includes('gdpr') || v.includes('data') || v.includes('persoonsgegevens'))
    return 'privacywetgeving, AVG/GDPR, gegevensbescherming, datalekken, toezicht Autoriteit Persoonsgegevens'
  if (v.includes('marketing') || v.includes('reclame') || v.includes('communicatie') || v.includes('consument'))
    return 'reclamewetgeving, consumentenbescherming, mededingingsrecht, ACM-toezicht'
  if (v.includes('it') || v.includes('ict') || v.includes('cyber') || v.includes('software') || v.includes('tech') || v.includes('digital'))
    return 'cybersecurity, digitalisering, NIS2, informatiebeveiliging, softwarewetgeving'
  if (v.includes('esg') || v.includes('duurzaam') || v.includes('milieu') || v.includes('klimaat') || v.includes('sustainab'))
    return 'ESG-regelgeving, duurzaamheidsrapportage, CSRD, klimaatbeleid, milieurecht'
  if (v.includes('zorg') || v.includes('medisch') || v.includes('gezondheid') || v.includes('pharma') || v.includes('vws'))
    return 'zorgwetgeving, Wkkgz, zorginkoop, NZa-toezicht, geneesmiddelenbeleid'
  if (v.includes('inkoop') || v.includes('aanbesteding') || v.includes('procurement'))
    return 'aanbestedingsrecht, inkoopbeleid, Europese aanbestedingsrichtlijnen'
  return ''
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
      system: `Je bent een juridisch redacteur die regelgevingsupdates schrijft voor professionals.

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
        content: `Ontvanger: ${profiel.naam}
Vakgebied: ${profiel.vakgebied}${vakgebiedContext ? ` (${vakgebiedContext})` : ''}
Organisatie: ${orgLabel[profiel.organisatie] ?? profiel.organisatie}
${profiel.voorkeuren ? `Schrijfstijl: ${profiel.voorkeuren.stijl === 'kort' ? 'kort en bondig, max 3 zinnen per item' : 'uitgebreid met context en achtergrond'}
Regio focus: ${profiel.voorkeuren.regio.join(', ')}
Extra onderwerpen om op te letten: ${profiel.voorkeuren.extraOnderwerpen || 'geen'}
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
