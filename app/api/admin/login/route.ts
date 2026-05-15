import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

export function sessionToken(adminPassword: string): string {
  return createHash('sha256').update(adminPassword + 'session').digest('hex')
}

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
    secure: true,
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
