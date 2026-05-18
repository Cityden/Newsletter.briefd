import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { teksten } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'nl'
  const t = teksten[locale]
  return {
    title: t.siteTitle,
    description: t.siteDescription,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'nl'

  return (
    <html lang={locale}>
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
