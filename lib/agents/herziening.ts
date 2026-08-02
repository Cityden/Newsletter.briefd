import { supabase } from '@/lib/supabase'
import type { RedactieItem } from './redactie'
import { stuurAlertMail } from './alert'
import { logAgentRun, timer } from './logging'

// Herzienings-agent (automatiseringsplan sectie 8, "kan later worden aangehaakt").
// Regelgeving verandert na publicatie — een wetsvoorstel wordt uitgesteld, een
// uitspraak in hoger beroep herzien. Zonder dit merk je dat pas als een abonnee
// het meldt. Deze agent checkt periodiek eerder gepubliceerde items opnieuw
// tegen de bron en houdt bij welke items nog "actief gemonitord" worden.
//
// Belangrijk: bron_snapshot is de RUWE samenvatting van het bronartikel op het
// moment van publicatie (uit de classificatie-agent, vóór de redactie-agent het
// herschreef) — niet de herschreven nieuwsbrief-tekst. Vergelijken tegen de
// herschreven tekst zou verschillen in schrijfstijl kunnen aanzien voor een
// inhoudelijke wijziging.

const MONITOR_VENSTER_DAGEN = 90 // na 90 dagen zonder wijziging: afgehandeld, niet meer checken
const HERCONTROLE_NA_DAGEN = 14 // elk item hooguit eens per 14 dagen opnieuw
const MAX_PER_RUN = 25 // begrensd per cron-run — voorkomt een lange/dure job bij veel opgebouwde items

export interface GepubliceerdItemInput {
  // Alleen de velden die daadwerkelijk worden opgeslagen — een subset van
  // RedactieItem, zodat een aanroeper vanuit een opgeslagen concept-preview
  // (die geen 'actie' of 'datum' bewaart) dit niet met nepwaarden hoeft aan
  // te vullen.
  item: Pick<RedactieItem, 'titel' | 'impact' | 'type' | 'samenvatting' | 'bronUrl' | 'bronNaam'>
  bronSnapshot: string
  // Taal waarin dit specifieke item is geschreven (bepaalTaal-uitkomst voor de
  // abonnee die de redactie triggerde). Nodig omdat gepubliceerde_items per
  // bron_url dedupliceert over ALLE abonnees heen — zonder dit veld kan de
  // homepage niet weten of een opgeslagen item in het Nederlands of Engels is.
  taal: string
}

/** Aanroepen ná een succesvolle verzending — dedupliceert zelf op bron_url. */
export async function registreerGepubliceerdeItems(inputs: GepubliceerdItemInput[]): Promise<void> {
  if (inputs.length === 0) return

  const rows = inputs.map(({ item, bronSnapshot, taal }) => ({
    bron_url: item.bronUrl,
    bron_naam: item.bronNaam,
    titel: item.titel,
    samenvatting: item.samenvatting,
    bron_snapshot: bronSnapshot,
    impact: item.impact,
    type: item.type,
    taal,
  }))

  const { error } = await supabase
    .from('gepubliceerde_items')
    .upsert(rows, { onConflict: 'bron_url', ignoreDuplicates: true })

  if (error) {
    console.error('[herziening] registreren van gepubliceerde items mislukt:', error.message)
  }
}

// Wat een goedgekeurd concept (concept_nieuwsbrieven.items_preview) bewaart per
// item — genoeg om er later, ná verzending, een gepubliceerde_items-rij van te
// maken. Los van RedactieItem omdat een concept geen 'actie' of 'datum' bewaart.
export interface ConceptItemPreview {
  titel: string
  impact: RedactieItem['impact']
  type: RedactieItem['type']
  bronNaam: string
  bronUrl: string
  samenvatting: string
  bronSnapshot: string
  taal: string
}

/** Voor de maandagcron: registreert de items van een al verstuurd, goedgekeurd concept. */
export async function registreerUitConceptPreview(preview: ConceptItemPreview[]): Promise<void> {
  await registreerGepubliceerdeItems(
    preview.map(p => ({
      item: { titel: p.titel, impact: p.impact, type: p.type, samenvatting: p.samenvatting, bronUrl: p.bronUrl, bronNaam: p.bronNaam },
      bronSnapshot: p.bronSnapshot,
      taal: p.taal,
    }))
  )
}

export async function herzieningsAgent(): Promise<{ gecontroleerd: number; rectificaties: number }> {
  const stop = timer()
  const herrcontroleGrens = new Date(Date.now() - HERCONTROLE_NA_DAGEN * 24 * 60 * 60 * 1000).toISOString()
  const afhandelGrens = new Date(Date.now() - MONITOR_VENSTER_DAGEN * 24 * 60 * 60 * 1000).toISOString()

  const { data: items, error } = await supabase
    .from('gepubliceerde_items')
    .select('*')
    .eq('status', 'actief_gemonitord')
    .or(`laatst_gecontroleerd_op.is.null,laatst_gecontroleerd_op.lt.${herrcontroleGrens}`)
    .limit(MAX_PER_RUN)

  if (error || !items) {
    await logAgentRun({
      agent: 'herziening',
      inputRef: 'weekly-check',
      status: 'mislukt',
      reden: error?.message,
      durationMs: stop(),
    })
    return { gecontroleerd: 0, rectificaties: 0 }
  }

  let rectificaties = 0
  const rectificatieRegels: string[] = []

  for (const item of items) {
    // Buiten het monitoringvenster: afhandelen, niet blijven checken (voorkomt onbeperkte groei van werk)
    if (item.eerst_gepubliceerd_op < afhandelGrens) {
      await supabase
        .from('gepubliceerde_items')
        .update({ status: 'afgehandeld', laatst_gecontroleerd_op: new Date().toISOString() })
        .eq('id', item.id)
      continue
    }

    try {
      const res = await fetch(item.bron_url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) {
        await supabase
          .from('gepubliceerde_items')
          .update({ laatst_gecontroleerd_op: new Date().toISOString() })
          .eq('id', item.id)
        continue
      }
      const huidigeTekst = (await res.text())
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: `Je vergelijkt een eerder gepubliceerde samenvatting met de HUIDIGE staat van dezelfde bronpagina.
Is er een materiële wijziging (bijv. wetsvoorstel uitgesteld/ingetrokken, uitspraak herzien in hoger beroep,
een bedrag, percentage of ingangsdatum gewijzigd)? Kleine tekstuele of opmaakverschillen tellen niet als wijziging.
Antwoord UITSLUITEND met JSON: {"gewijzigd": true of false, "toelichting": "max 1 zin"}`,
          messages: [
            {
              role: 'user',
              content: `EERDER GEPUBLICEERDE SAMENVATTING:\n${item.bron_snapshot}\n\nHUIDIGE BRONTEKST (ruw, van dezelfde URL):\n${huidigeTekst}`,
            },
          ],
        }),
      })
      const data = await response.json()
      if (data.error) throw new Error(JSON.stringify(data.error))

      const tekst = data.content?.[0]?.text ?? '{}'
      const clean = tekst.replace(/```json|```/g, '').trim()
      const check: { gewijzigd: boolean; toelichting: string } = JSON.parse(clean)

      if (check.gewijzigd) {
        rectificaties++
        rectificatieRegels.push(
          `<strong>${item.titel}</strong> (${item.bron_naam}) — ${check.toelichting}. <a href="${item.bron_url}">Bron</a>`
        )
        await supabase
          .from('gepubliceerde_items')
          .update({
            status: 'rectificatie_nodig',
            rectificatie_notitie: check.toelichting,
            laatst_gecontroleerd_op: new Date().toISOString(),
          })
          .eq('id', item.id)
      } else {
        await supabase
          .from('gepubliceerde_items')
          .update({ laatst_gecontroleerd_op: new Date().toISOString() })
          .eq('id', item.id)
      }
    } catch {
      // Escaleren bij twijfel: laat status ongewijzigd staan, geen gok — volgende cyclus opnieuw proberen.
      await supabase
        .from('gepubliceerde_items')
        .update({ laatst_gecontroleerd_op: new Date().toISOString() })
        .eq('id', item.id)
    }
  }

  if (rectificaties > 0) {
    await stuurAlertMail(`Herzieningsagent: ${rectificaties} item(s) mogelijk verouderd`, rectificatieRegels)
  }

  await logAgentRun({
    agent: 'herziening',
    inputRef: 'weekly-check',
    output: { gecontroleerd: items.length, rectificaties },
    status: rectificaties > 0 ? 'geëscaleerd' : 'gelukt',
    durationMs: stop(),
  })

  return { gecontroleerd: items.length, rectificaties }
}
