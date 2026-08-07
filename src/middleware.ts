import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { NEXUS_SECRET, SESSION_COOKIE_NAME } from './lib/auth-constants'

/**
 * Universal Base64 Helpers (Edge Runtime Compatible)
 */
function decodeBase64(str: string): string {
  // Edge runtime globally supports atob for base64 decoding
  return atob(str)
}

function encodeBase64(str: string): string {
  // Edge runtime globally supports btoa for base64 encoding
  return btoa(str)
}

/**
 * Nexus Protocol Middleware
 * Performs Edge-level signature verification to enforce high-fidelity access control.
 */
export default function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  
  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // If unauthenticated trying to access protected paths
  if (!sessionCookie && (isStudentRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie) {
    try {
      // Standardized Structured Token Decoding (Edge-Compatible)
      const raw = decodeBase64(sessionCookie)
      const token = JSON.parse(raw) as { d: string; s: string }
      
      if (!token.d || !token.s) throw new Error('Malformed Token')

      // Edge-runtime compatible verification (Universal btoa)
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

    } catch(e) {
      // Protocol Violation Detected: Invalidate and Eject to Login
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
