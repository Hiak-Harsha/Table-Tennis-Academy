import { cookies } from 'next/headers'
import { NEXUS_SECRET, SESSION_COOKIE_NAME } from './auth-constants'

/**
 * Universal Base64 Helpers (Edge & Node Compatible)
 */
function decodeBase64(str: string): string {
  if (typeof atob === 'function') return atob(str)
  return Buffer.from(str, 'base64').toString('utf8')
}

function encodeBase64(str: string): string {
  if (typeof btoa === 'function') return btoa(str)
  return Buffer.from(str, 'utf8').toString('base64')
}

export async function getSession() {
  const cookieStore = await cookies()
  const val = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!val) return null

  try {
    const raw = decodeBase64(val)
    const token = JSON.parse(raw) as { d: string; s: string }

    if (!token.d || !token.s) return null

    // Reconstruct expected signature and verify
    const expectedSig = encodeBase64(token.d + NEXUS_SECRET).substring(0, 10)
    
    if (expectedSig !== token.s) {
      console.warn(`[AUTH_SECURITY] SIG Mismatch! Recv: ${token.s} | Exp: ${expectedSig}`)
      return null
    }

    return JSON.parse(token.d)
  } catch (e) {
    console.error('[AUTH_SECURITY] Protocol Failure:', e)
    return null
  }
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export async function requireStudent() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    throw new Error('Unauthorized: Student access required')
  }
  return session
}

export async function requireAny() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized: Session required')
  }
  return session
}
