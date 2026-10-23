import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-tta_session' : 'tta_session'

const SESSION_EXPIRATION_DAYS = 7
const secretKey = new TextEncoder().encode(env.SESSION_SECRET)

export interface SessionPayload {
  sub: string // userId
  role: 'ADMIN' | 'STUDENT'
  sid: string // session DB id
  studentId?: string // logical athlete ID e.g. TTA-0892
  internalStudentId?: string // Student UUID
}

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
 * Hash raw token for safe storage in DB
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a cryptographically signed JWT session token
 */
export async function signSessionToken(payload: SessionPayload, expiresAt: Date): Promise<string> {
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
 * Verify JWT signature without DB lookup (for Edge proxy/middleware checks)
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
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
 * 4. Verifies student enrollmentStatus is ACTIVE (locks out SUSPENDED/INACTIVE immediately)
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
 * Revoke all active sessions for a user (e.g. on password change or suspension)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Cookie option helper
 */
export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}
