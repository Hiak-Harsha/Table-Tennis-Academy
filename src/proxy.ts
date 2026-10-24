import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session-token'

/**
 * Next.js 16 Proxy Convention
 * Cryptographic signature verification and route protection.
 */
export default async function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Unauthenticated request to protected routes
  if (!sessionCookie && (isStudentRoute || isAdminRoute)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.headers.set('x-request-id', requestId)
    return response
  }

  if (sessionCookie) {
    const payload = await verifySessionToken(sessionCookie)

    // Token forged, tampered, or expired
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(SESSION_COOKIE_NAME)
      response.headers.set('x-request-id', requestId)
      return response
    }

    // Role-based route guardrails
    if (isAdminRoute && payload.role !== 'ADMIN') {
      const response = NextResponse.redirect(new URL('/student', request.url))
      response.headers.set('x-request-id', requestId)
      return response
    }

    if (isStudentRoute && payload.role !== 'STUDENT') {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.headers.set('x-request-id', requestId)
      return response
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: ['/student/:path*', '/admin/:path*'],
}
