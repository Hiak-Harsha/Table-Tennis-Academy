'use server'

import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  SESSION_COOKIE_NAME,
  createSession,
  revokeSession,
  getSessionCookieOptions,
} from '@/lib/session'
import { hashPassword, verifyAndMigratePassword } from '@/lib/password'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { writeAuditLog } from '@/lib/audit'
import { sanitizeText } from '@/lib/sanitize'
import { normalizePhone, isValidPhone } from '@/lib/phone'
import { requestOtpChallenge, verifyOtpChallenge, OtpPurpose } from '@/lib/otp'

const UnifiedLoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your ID or mobile number.').trim(),
  password: z.string().min(1, 'Please enter your password.'),
  role: z.enum(['ADMIN', 'STUDENT']),
})

const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name required (minimum 2 characters).')
    .trim()
    .transform(sanitizeText),
  phone: z
    .string()
    .min(10, 'Valid 10-digit mobile number required.')
    .refine((val) => isValidPhone(val), 'Valid Indian mobile number required (starting 6-9).')
    .transform((val) => normalizePhone(val)),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  age: z.preprocess((v) => Number(v), z.number().min(5, 'Minimum age is 5').max(70, 'Maximum age is 70')),
  batchType: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
})

/**
 * Extract client IP address for security logging & rate limiting
 */
async function getClientIp(): Promise<string> {
  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return headerStore.get('x-real-ip') || '127.0.0.1'
}

/**
 * Unified Authentication Protocol
 * Standardizes authentication with cryptographic password hashing, rate limiting, and DB session tracking.
 */
export async function unifiedLoginAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | void> {
  const ip = await getClientIp()

  try {
    const validated = UnifiedLoginSchema.parse({
      identifier: formData.get('identifier'),
      password: formData.get('password'),
      role: formData.get('role'),
    })

    // 1. Enforce rate limiting: max 5 attempts per 15 minutes per identifier/IP
    const rateLimitKey = `login:${validated.identifier.toLowerCase()}:${ip}`
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 900)

    if (!rateLimit.allowed) {
      await writeAuditLog({
        action: 'RATE_LIMIT_BLOCKED',
        entity: 'Login',
        details: { identifier: validated.identifier, ip, retryAfter: rateLimit.retryAfterSeconds },
        ipAddress: ip,
      })
      return {
        error: `Too many failed attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      }
    }

    if (validated.role === 'ADMIN') {
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          OR: [
            { phone: validated.identifier },
            { id: validated.identifier },
          ],
        },
      })

      if (!adminUser) {
        await writeAuditLog({
          action: 'LOGIN_FAILURE',
          entity: 'User',
          details: { identifier: validated.identifier, role: 'ADMIN', reason: 'User not found' },
          ipAddress: ip,
        })
        return { error: 'Invalid credentials. Please verify your administrative identifier and password.' }
      }

      // Verify password and transparently re-hash if legacy plaintext
      const isPasswordValid = await verifyAndMigratePassword(
        validated.password,
        adminUser.passwordHash,
        async (newHash) => {
          await prisma.user.update({
            where: { id: adminUser.id },
            data: { passwordHash: newHash },
          })
          await writeAuditLog({
            actorId: adminUser.id,
            actorRole: 'ADMIN',
            action: 'PASSWORD_HASH_UPGRADED',
            entity: 'User',
            entityId: adminUser.id,
            ipAddress: ip,
          })
        }
      )

      if (!isPasswordValid) {
        await writeAuditLog({
          actorId: adminUser.id,
          actorRole: 'ADMIN',
          action: 'LOGIN_FAILURE',
          entity: 'User',
          entityId: adminUser.id,
          details: { reason: 'Invalid password' },
          ipAddress: ip,
        })
        return { error: 'Invalid credentials. Please verify your administrative identifier and password.' }
      }

      // Successful login: reset rate limit and create DB session
      await resetRateLimit(rateLimitKey)
      const { token, expiresAt } = await createSession({
        userId: adminUser.id,
        role: 'ADMIN',
        ipAddress: ip,
      })

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))

      await writeAuditLog({
        actorId: adminUser.id,
        actorRole: 'ADMIN',
        action: 'LOGIN_SUCCESS',
        entity: 'Session',
        ipAddress: ip,
      })

      redirect('/admin')
    } else {
      // Role is STUDENT
      let student = await prisma.student.findUnique({
        where: { studentId: validated.identifier },
        include: { user: true },
      })

      if (!student) {
        const userWithStudent = await prisma.user.findUnique({
          where: { phone: validated.identifier },
          include: { studentAccess: true },
        })
        if (userWithStudent?.studentAccess) {
          student = { ...userWithStudent.studentAccess, user: userWithStudent }
        }
      }

      if (!student || !student.user) {
        await writeAuditLog({
          action: 'LOGIN_FAILURE',
          entity: 'Student',
          details: { identifier: validated.identifier, role: 'STUDENT', reason: 'Student not found' },
          ipAddress: ip,
        })
        return { error: 'Invalid credentials. Please verify your mobile number/student ID and password.' }
      }

      // Check student enrollment status
      if (student.enrollmentStatus !== 'ACTIVE') {
        await writeAuditLog({
          actorId: student.user.id,
          actorRole: 'STUDENT',
          action: 'LOGIN_BLOCKED_INACTIVE',
          entity: 'Student',
          entityId: student.id,
          details: { status: student.enrollmentStatus },
          ipAddress: ip,
        })
        return { error: 'Your student account is currently not active. Please contact the academy.' }
      }

      // Verify password and transparently re-hash if legacy plaintext
      const isPasswordValid = await verifyAndMigratePassword(
        validated.password,
        student.user.passwordHash,
        async (newHash) => {
          await prisma.user.update({
            where: { id: student.user.id },
            data: { passwordHash: newHash },
          })
          await writeAuditLog({
            actorId: student.user.id,
            actorRole: 'STUDENT',
            action: 'PASSWORD_HASH_UPGRADED',
            entity: 'User',
            entityId: student.user.id,
            ipAddress: ip,
          })
        }
      )

      if (!isPasswordValid) {
        await writeAuditLog({
          actorId: student.user.id,
          actorRole: 'STUDENT',
          action: 'LOGIN_FAILURE',
          entity: 'User',
          entityId: student.user.id,
          details: { reason: 'Invalid password' },
          ipAddress: ip,
        })
        return { error: 'Invalid credentials. Please verify your mobile number/student ID and password.' }
      }

      // Successful login
      await resetRateLimit(rateLimitKey)
      const { token, expiresAt } = await createSession({
        userId: student.user.id,
        role: 'STUDENT',
        studentId: student.studentId,
        internalStudentId: student.id,
        ipAddress: ip,
      })

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))

      await writeAuditLog({
        actorId: student.user.id,
        actorRole: 'STUDENT',
        action: 'LOGIN_SUCCESS',
        entity: 'Session',
        ipAddress: ip,
      })

      redirect('/student')
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message }
    }
    // Let Next.js redirects propagate
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    console.error('[AUTH_ERROR] Unexpected login failure:', error)
    return { error: 'An unexpected authentication error occurred. Please try again.' }
  }
}

/**
 * Logout action with explicit session revocation
 */
export async function logoutAction(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      await revokeSession(token)
    }

    cookieStore.delete(SESSION_COOKIE_NAME)
  } catch (error) {
    console.error('[AUTH_LOGOUT_ERROR]', error)
  }
  redirect('/login')
}

/**
 * Student Registration Action with password hashing and session generation
 */
export async function registerStudentAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | void> {
  const ip = await getClientIp()

  try {
    // Rate limit registrations: max 3 attempts per hour per IP
    const rateLimit = await checkRateLimit(`register:${ip}`, 5, 3600)
    if (!rateLimit.allowed) {
      return { error: 'Too many registration requests from this network. Please try again later.' }
    }

    const validated = RegisterSchema.parse({
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      age: formData.get('age'),
      batchType: formData.get('batchType'),
    })

    const existingUser = await prisma.user.findUnique({
      where: { phone: validated.phone },
    })

    if (existingUser) {
      return { error: 'A student account with this mobile number already exists.' }
    }

    // Hash the password with bcrypt (12 rounds)
    const passwordHash = await hashPassword(validated.password)

    // Generate unique sequential-style student ID
    const studentCount = await prisma.student.count()
    const studentIdStr = `TTA-${String(studentCount + 1001).padStart(5, '0')}`

    let createdUserId = ''
    let createdStudentId = ''

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: validated.phone,
          passwordHash,
          role: 'STUDENT',
        },
      })

      const student = await tx.student.create({
        data: {
          studentId: studentIdStr,
          userId: newUser.id,
          fullName: validated.fullName,
          age: validated.age,
          batchType: validated.batchType,
          enrollmentStatus: 'ACTIVE',
        },
      })

      createdUserId = newUser.id
      createdStudentId = student.id
    })

    // Create session and log audit event
    const { token, expiresAt } = await createSession({
      userId: createdUserId,
      role: 'STUDENT',
      studentId: studentIdStr,
      internalStudentId: createdStudentId,
      ipAddress: ip,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))

    await writeAuditLog({
      actorId: createdUserId,
      actorRole: 'STUDENT',
      action: 'REGISTER_STUDENT',
      entity: 'Student',
      entityId: createdStudentId,
      details: { studentId: studentIdStr, batchType: validated.batchType },
      ipAddress: ip,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message }
    }
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    console.error('[REGISTRATION_ERROR]', error)
    return { error: 'Failed to complete registration. Please try again.' }
  }

  redirect('/student?welcome=true')
}

/**
 * Server action to request a phone verification OTP.
 */
export async function requestOtpAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const ip = await getClientIp()
  const rawPhone = (formData.get('phone') as string) || ''
  const purpose = ((formData.get('purpose') as string) || 'REGISTER') as OtpPurpose

  try {
    const normalized = normalizePhone(rawPhone)
    const rateLimit = await checkRateLimit(`otp:${ip}:${normalized}`, 5, 3600)
    if (!rateLimit.allowed) {
      return { success: false, message: 'Too many verification code requests. Please wait an hour.' }
    }

    const res = await requestOtpChallenge({
      phone: normalized,
      purpose,
      ipAddress: ip,
    })

    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to request OTP.'
    return { success: false, message: msg }
  }
}

/**
 * Server action to verify an OTP challenge.
 */
export async function verifyOtpAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
  const rawPhone = (formData.get('phone') as string) || ''
  const purpose = ((formData.get('purpose') as string) || 'REGISTER') as OtpPurpose
  const code = (formData.get('code') as string) || ''

  try {
    const normalized = normalizePhone(rawPhone)
    const res = await verifyOtpChallenge({
      phone: normalized,
      purpose,
      code,
    })
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed.'
    return { success: false, message: msg }
  }
}

