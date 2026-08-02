import { cookies } from 'next/headers'
import HomeClient from './HomeClient'
import { supabase } from '@/lib/supabase'
import { IMPACT_LABEL, TYPE_LABEL, TAAL_PER_LOCALE, type Locale, type PreviewItem } from '@/lib/locale'

// ISO 8601-weeknummer. Donderdag van de week bepaalt het jaar waar de week bij
// hoort (het standaardgeval waar "week 1" op kan afwijken van de kalenderweek).
function huidigeWeekNummer(): number {
  const nu = new Date()
  const d = new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), nu.getDate()))
  const dagNummer = (d.getUTCDay() + 6) % 7 // maandag = 0
  d.setUTCDate(d.getUTCDate() - dagNummer + 3) // donderdag van deze week
  const eersteDonderdag = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const verschilMs = d.getTime() - eersteDonderdag.getTime()
  return 1 + Math.round(verschilMs / (7 * 24 * 60 * 60 * 1000))
}

function verkort(tekst: string, max = 170): string {
  if (tekst.length <= max) return tekst
  return tekst.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

// De preview-kaart moet altijd renderen, ook als de database niet bereikbaar
// is of de nieuwe kolommen (impact/type/taal, zie schema.sql) nog niet zijn
// aangemaakt — daarom hier alles vangen en null teruggeven i.p.v. laten
// crashen. HomeClient valt dan terug op de vaste voorbeelditems.
async function haalRecenteItems(locale: Locale): Promise<PreviewItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('gepubliceerde_items')
      .select('titel, samenvatting, impact, type')
      .eq('taal', TAAL_PER_LOCALE[locale])
      .neq('status', 'rectificatie_nodig')
      .order('eerst_gepubliceerd_op', { ascending: false })
      .limit(2)

    if (error) {
      // Gebeurt o.a. zolang de impact/type/taal-kolommen uit schema.sql nog niet
      // zijn aangemaakt — dan blijft de fallback zonder waarschuwing draaien.
      console.error('[homepage] recente items ophalen mislukt:', error.message)
      return null
    }
    if (!data || data.length === 0) return null

    return data.map(row => ({
      impact: (row.impact && IMPACT_LABEL[locale][row.impact]) || IMPACT_LABEL[locale].gemiddeld,
      type: (row.type && TYPE_LABEL[locale][row.type]) || TYPE_LABEL[locale].beleid,
      title: row.titel ?? '',
      desc: verkort(row.samenvatting ?? ''),
    }))
  } catch (err) {
    console.error('[homepage] recente items ophalen mislukt:', err)
    return null
  }
}

export default async function Page() {
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'nl'
  const previewItems = await haalRecenteItems(locale)

  return <HomeClient locale={locale} weekNummer={huidigeWeekNummer()} previewItems={previewItems ?? undefined} />
}
