import { cookies } from 'next/headers'
import InschrijvenClient from './InschrijvenClient'
import type { Locale } from '@/lib/locale'

export default async function InschrijvenPage() {
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'nl'

  return <InschrijvenClient locale={locale} />
}
