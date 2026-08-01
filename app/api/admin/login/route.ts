import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { wachtwoord } = await req.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD niet ingesteld' }, { status: 500 })
  }

  if (wachtwoord !== adminPassword) {
    return NextResponse.json({ error: 'Ongeldig wachtwoord' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', sessionToken(adminPassword), {
    httpOnly: true,
    // Alleen over HTTPS. In dev draait de server op http://localhost en weigert
    // Safari een Secure-cookie op te slaan — de login lijkt dan te mislukken
    // terwijl het wachtwoord klopt. Chromium accepteert hem daar juist wel,
    // dus dit valt niet op als je alleen in Chrome test.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 uur
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ ok: true })
}
