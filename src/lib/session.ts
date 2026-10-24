import crypto from 'crypto'
import prisma from '@/lib/prisma'
import {
  signSessionToken,
  verifySessionToken,
  hashToken,
  SESSION_COOKIE_NAME,
  SessionPayload,
} from './session-token'

export {
  signSessionToken,
  verifySessionToken,
  hashToken,
  SESSION_COOKIE_NAME,
}
export type { SessionPayload }

const SESSION_EXPIRATION_DAYS = 7
const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export interface AuthenticatedUser {
  id: string
  role: 'ADMIN' | 'STUDENT'
  phone: string | null
  sessionId: string
  name: string
  studentId?: string
  internalStudentId?: string
  displayId?: string
  student?: {
    id: string
    studentId: string
    fullName: string
    batchType: string
    enrollmentStatus: string
  }
}

/**
 * Cookie option helper:
 * Decides 'secure' and '__Host-' based on HTTPS availability or AUTH_COOKIE_INSECURE_DEV override.
 */
export function getSessionCookieOptions(expiresAt: Date) {
  const isHttps =
    process.env.APP_URL?.startsWith('https://') ||
    (process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_INSECURE_DEV !== '1')

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

/**
 * Create a new DB-backed session and return signed token and expiration
 */
export async function createSession(params: {
  userId: string
  role: 'ADMIN' | 'STUDENT'
  studentId?: string
  internalStudentId?: string
  userAgent?: string
  ipAddress?: string
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
  const sessionId = crypto.randomUUID()

  // Generate signed token with session ID claim
  const token = await signSessionToken(
    {
      sub: params.userId,
      role: params.role,
      sid: sessionId,
      studentId: params.studentId,
      internalStudentId: params.internalStudentId,
    },
    expiresAt
  )

  const tokenHash = hashToken(token)

  // Persist session to database for revocation support
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: params.userId,
      tokenHash,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      lastSeenAt: new Date(),
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Authoritatively validate session against the database:
 * 1. Verifies cryptographic signature
 * 2. Verifies session exists, is not revoked, and is unexpired in DB
 * 3. Verifies user exists
 * 4. Verifies student enrollmentStatus is ACTIVE
 * 5. Updates lastSeenAt at most once every 5 minutes
 */
export async function validateSession(token: string | null | undefined): Promise<AuthenticatedUser | null> {
  if (!token) return null

  // 1. Cryptographic token check
  const payload = await verifySessionToken(token)
  if (!payload) return null

  const tokenHash = hashToken(token)

  // 2. Database session lookup
  const sessionRecord = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          studentAccess: true,
        },
      },
    },
  })

  if (!sessionRecord) return null
  if (sessionRecord.revokedAt !== null) return null
  if (sessionRecord.expiresAt < new Date()) return null

  const user = sessionRecord.user
  if (!user) return null

  // 3. For student athletes, re-verify active status
  if (user.role === 'STUDENT' && user.studentAccess) {
    if (user.studentAccess.enrollmentStatus !== 'ACTIVE') {
      // User has been suspended/deactivated; reject access
      return null
    }
  }

  // 4. Throttle lastSeenAt updates to avoid excessive database writes (max once every 5 min)
  const now = Date.now()
  if (!sessionRecord.lastSeenAt || now - sessionRecord.lastSeenAt.getTime() > LAST_SEEN_UPDATE_INTERVAL_MS) {
    // Fire-and-forget update
    prisma.session
      .update({
        where: { id: sessionRecord.id },
        data: { lastSeenAt: new Date() },
      })
      .catch((err) => {
        console.error('[SESSION_UPDATE_ERROR] Failed to update lastSeenAt:', err)
      })
  }

  const studentAccess = user.studentAccess
  const name = user.role === 'ADMIN' ? 'Academy Admin' : studentAccess?.fullName || 'Athlete'

  return {
    id: user.id,
    role: user.role as 'ADMIN' | 'STUDENT',
    phone: user.phone,
    sessionId: sessionRecord.id,
    name,
    studentId: studentAccess?.studentId,
    internalStudentId: studentAccess?.id,
    displayId: studentAccess?.studentId,
    student: studentAccess
      ? {
          id: studentAccess.id,
          studentId: studentAccess.studentId,
          fullName: studentAccess.fullName,
          batchType: studentAccess.batchType,
          enrollmentStatus: studentAccess.enrollmentStatus,
        }
      : undefined,
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Revoke all active sessions for a user (on password change, reset, or suspension)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Clean up expired sessions from the database
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  })
  return result.count
}
