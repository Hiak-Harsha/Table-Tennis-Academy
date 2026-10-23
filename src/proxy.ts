import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { NEXUS_SECRET, SESSION_COOKIE_NAME } from './lib/auth-constants'

function decodeBase64(str: string): string {
  return atob(str)
}

function encodeBase64(str: string): string {
  return btoa(str)
}

/**
 * Next.js 16 Proxy Convention (replaces deprecated middleware)
 * Edge/Node request proxying and session routing guardrails.
 */
export default function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // If unauthenticated trying to access protected paths
  if (!sessionCookie && (isStudentRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie) {
    try {
      const raw = decodeBase64(sessionCookie)
      const token = JSON.parse(raw) as { d: string; s: string }

      if (!token.d || !token.s) throw new Error('Malformed Token')

      const expectedSig = encodeBase64(token.d + NEXUS_SECRET).substring(0, 10)

      if (expectedSig !== token.s) {
        throw new Error('Signature Compromised')
      }

      const decodedInfo = JSON.parse(token.d)

      // Role-Based Guardrails
      if (isAdminRoute && decodedInfo.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/student', request.url))
      }

      if (isStudentRoute && decodedInfo.role !== 'STUDENT') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (e) {
      console.error('[SECURITY_HANDSHAKE] Verification Failure:', e)
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/admin/:path*'],
}
