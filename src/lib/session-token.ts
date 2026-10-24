import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

export interface SessionPayload {
  sub: string // userId
  role: 'ADMIN' | 'STUDENT'
  sid: string // session DB id
  studentId?: string // logical athlete ID e.g. TTA-0892
  internalStudentId?: string // Student UUID
}

/**
 * Determine session cookie name based on whether HTTPS / Secure cookie is possible
 */
export function getSessionCookieName(): string {
  const isHttps =
    process.env.APP_URL?.startsWith('https://') ||
    (process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_INSECURE_DEV !== '1')

  return isHttps ? '__Host-tta_session' : 'tta_session'
}

export const SESSION_COOKIE_NAME = getSessionCookieName()

/**
 * Get secret key for JWT signing / verification
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod'
  return new TextEncoder().encode(secret)
}

/**
 * Hash raw token with SHA-256 for safe storage in the database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a cryptographically signed JWT session token (HS256)
 */
export async function signSessionToken(payload: SessionPayload, expiresAt: Date): Promise<string> {
  const secretKey = getSecretKey()
  return new SignJWT({
    role: payload.role,
    sid: payload.sid,
    studentId: payload.studentId,
    internalStudentId: payload.internalStudentId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey)
}

/**
 * Verify JWT signature without any database lookup.
 * Suitable for Next.js 16 Proxy checks.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
    if (!payload.sub || !payload.role || !payload.sid) return null

    return {
      sub: payload.sub,
      role: payload.role as 'ADMIN' | 'STUDENT',
      sid: payload.sid as string,
      studentId: payload.studentId as string | undefined,
      internalStudentId: payload.internalStudentId as string | undefined,
    }
  } catch {
    return null
  }
}
