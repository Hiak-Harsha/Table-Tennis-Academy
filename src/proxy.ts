import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session'

/**
 * Next.js 16 Proxy Convention
 * Cryptographic signature verification and route protection.
 */
export default async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Unauthenticated request to protected routes
  if (!sessionCookie && (isStudentRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie) {
    const payload = await verifySessionToken(sessionCookie)

    // Token forged, tampered, or expired
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    // Role-based route guardrails
    if (isAdminRoute && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/student', request.url))
    }

    if (isStudentRoute && payload.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/admin/:path*'],
}
