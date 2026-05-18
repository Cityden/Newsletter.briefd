import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const locale = host.includes('.online') ? 'en' : 'nl'

  const res = NextResponse.next()
  res.cookies.set('locale', locale, { path: '/', sameSite: 'strict' })
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
