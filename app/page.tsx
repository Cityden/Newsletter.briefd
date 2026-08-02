import { cookies } from 'next/headers'
import HomeClient from './HomeClient'
import type { Locale } from '@/lib/locale'

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

export default async function Page() {
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'nl'

  return <HomeClient locale={locale} weekNummer={huidigeWeekNummer()} />
}
