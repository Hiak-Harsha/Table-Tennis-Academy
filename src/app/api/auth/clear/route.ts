import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session-token'

export const dynamic = 'force-dynamic'

/**
 * Cleanly clears the session cookie and redirects to /login with reason.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reason = searchParams.get('reason') || 'expired'

  const loginUrl = new URL(`/login?reason=${reason}`, request.url)
  const response = NextResponse.redirect(loginUrl)

  // Clear cookie
  response.cookies.delete(SESSION_COOKIE_NAME)
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })

  return response
}
