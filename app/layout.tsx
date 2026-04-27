import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regelgeving Nieuwsbrief',
  description: 'Gepersonaliseerde updates over wetswijzigingen en juridische uitspraken',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
