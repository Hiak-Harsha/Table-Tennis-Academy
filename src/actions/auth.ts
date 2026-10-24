'use server'

import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { z } from 'zod'
import {
  SESSION_COOKIE_NAME,
  createSession,
  revokeSession,
  revokeAllUserSessions,
  getSessionCookieOptions,
} from '@/lib/session'
import { hashPassword, verifyPassword, DUMMY_BCRYPT_HASH } from '@/lib/password'
import { checkRateLimit, resetRateLimit, extractClientIp } from '@/lib/rate-limit'
import { writeAuditLog } from '@/lib/audit'
import { sanitizeText } from '@/lib/sanitize'
import { normalizePhone, isValidPhone } from '@/lib/phone'
import { resolveLoginIdentifier } from '@/lib/identity'
import { generateStudentId } from '@/lib/student-id'
import {
  requestOtpChallenge,
  verifyOtpChallenge,
  verifyVerificationToken,
  OtpPurposeSchema,
  OtpPurpose,
} from '@/lib/otp'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export interface AuthState {
  error?: string
  ts?: number
  referenceId?: string
}

const UnifiedLoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your mobile number or ID.').trim(),
  password: z.string().min(1, 'Please enter your password.'),
  role: z.enum(['ADMIN', 'STUDENT']),
})

const RegisterSchema = z
  .object({
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
    verificationToken: z.string().min(10, 'Mobile verification is required.'),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    guardianConsent: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.age < 18) {
      if (!data.guardianName || data.guardianName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian name is required for applicants under 18 years of age.',
          path: ['guardianName'],
        })
      }
      if (!data.guardianPhone || !isValidPhone(data.guardianPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valid guardian mobile number is required for applicants under 18 years of age.',
          path: ['guardianPhone'],
        })
      }
      if (!data.guardianConsent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian consent confirmation is required for applicants under 18 years of age.',
          path: ['guardianConsent'],
        })
      }
    }
  })

const PasswordResetRequestSchema = z.object({
  phone: z
    .string()
    .min(10, 'Valid 10-digit mobile number required.')
    .refine((val) => isValidPhone(val), 'Valid Indian mobile number required.')
    .transform((val) => normalizePhone(val)),
})

const PasswordResetConfirmSchema = z.object({
  phone: z
    .string()
    .min(10, 'Valid mobile number required.')
    .transform((val) => normalizePhone(val)),
  verificationToken: z.string().min(10, 'Verification token is required.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.'),
})

/**
 * Extract client IP address for security logging & rate limiting
 */
async function getClientIp(): Promise<string> {
  const headerStore = await headers()
  return extractClientIp(headerStore)
}

/**
 * Unified Authentication Protocol
 * Standardizes authentication with constant-time verification, canonical identity resolution,
 * durable rate limiting, and DB session tracking.
 */
export async function unifiedLoginAction(
  _prevState: unknown,
  formData: FormData
): Promise<AuthState | void> {
  const ip = await getClientIp()
  const now = Date.now()
  const referenceId = crypto.randomBytes(4).toString('hex')

  try {
    const validated = UnifiedLoginSchema.parse({
      identifier: formData.get('identifier'),
      password: formData.get('password'),
      role: formData.get('role'),
    })

    // 1. Resolve canonical identity
    const resolved = resolveLoginIdentifier(validated.identifier)

    // 2. Enforce durable rate limiting (per identifier and per IP)
    const rateLimitIdentifierKey = `login:id:${resolved.value.toLowerCase()}`
    const rateLimitIpKey = `login:ip:${ip}`

    const [idLimit, ipLimit] = await Promise.all([
      checkRateLimit(rateLimitIdentifierKey, 5, 900), // 5 attempts per 15 min per account
      checkRateLimit(rateLimitIpKey, 20, 900), // 20 attempts per 15 min per IP
    ])

    if (!idLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(idLimit.retryAfterSeconds, ipLimit.retryAfterSeconds)
      console.warn(`[AUTH_RATE_LIMIT] Blocked login attempt. Code: RATE_LIMITED, IP: ${ip}, Ref: ${referenceId}`)
      await writeAuditLog({
        action: 'RATE_LIMIT_BLOCKED',
        entity: 'Login',
        details: { identifier: resolved.value, ip, retryAfter },
        ipAddress: ip,
      })
      return {
        error: `Too many failed attempts. Please try again in ${retryAfter} seconds.`,
        ts: now,
        referenceId,
      }
    }

    if (validated.role === 'ADMIN') {
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          OR: [
            { phone: resolved.value },
            { loginId: resolved.value },
            { id: resolved.value },
          ],
        },
      })

      // Constant-time execution: always run bcrypt compare to avoid user enumeration timing leaks
      const passwordMatch = adminUser?.passwordHash
        ? await verifyPassword(validated.password, adminUser.passwordHash)
        : await (async () => {
            await bcrypt.compare(validated.password, DUMMY_BCRYPT_HASH)
            return { matches: false, needsRehash: false }
          })()

      if (!adminUser) {
        console.warn(`[AUTH_FAILURE] Admin user not found. Code: NO_USER, Ref: ${referenceId}`)
        await writeAuditLog({
          action: 'LOGIN_FAILURE',
          entity: 'User',
          details: { role: 'ADMIN', reason: 'NO_USER' },
          ipAddress: ip,
        })
        return {
          error: 'Invalid credentials. Please verify your administrative identifier and password.',
          ts: now,
          referenceId,
        }
      }

      if (!passwordMatch.matches) {
        console.warn(`[AUTH_FAILURE] Admin password mismatch. Code: BAD_PASSWORD, Ref: ${referenceId}`)
        await writeAuditLog({
          actorId: adminUser.id,
          actorRole: 'ADMIN',
          action: 'LOGIN_FAILURE',
          entity: 'User',
          entityId: adminUser.id,
          details: { reason: 'BAD_PASSWORD' },
          ipAddress: ip,
        })
        return {
          error: 'Invalid credentials. Please verify your administrative identifier and password.',
          ts: now,
          referenceId,
        }
      }

      // Successful login: reset rate limit and create DB session
      await Promise.all([
        resetRateLimit(rateLimitIdentifierKey),
        resetRateLimit(rateLimitIpKey),
      ])

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
      let student = null
      let user = null

      if (resolved.type === 'STUDENT_ID') {
        student = await prisma.student.findUnique({
          where: { studentId: resolved.value },
          include: { user: true },
        })
        user = student?.user || null
      } else if (resolved.type === 'PHONE') {
        user = await prisma.user.findUnique({
          where: { phone: resolved.value },
          include: { studentAccess: true },
        })
        student = user?.studentAccess ? { ...user.studentAccess, user } : null
      } else {
        // Unknown or handle lookup fallback
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { loginId: resolved.value },
              { id: resolved.value },
            ],
          },
          include: { studentAccess: true },
        })
        student = user?.studentAccess ? { ...user.studentAccess, user } : null
      }

      // Constant-time execution: always run bcrypt compare to prevent user enumeration
      const passwordMatch = user?.passwordHash
        ? await verifyPassword(validated.password, user.passwordHash)
        : await (async () => {
            await bcrypt.compare(validated.password, DUMMY_BCRYPT_HASH)
            return { matches: false, needsRehash: false }
          })()

      if (!user || !student) {
        console.warn(`[AUTH_FAILURE] Student user not found. Code: NO_USER, Ref: ${referenceId}`)
        await writeAuditLog({
          action: 'LOGIN_FAILURE',
          entity: 'Student',
          details: { role: 'STUDENT', reason: 'NO_USER' },
          ipAddress: ip,
        })
        return {
          error: 'Invalid credentials. Please verify your mobile number or Student ID and password.',
          ts: now,
          referenceId,
        }
      }

      if (!passwordMatch.matches) {
        console.warn(`[AUTH_FAILURE] Student password mismatch. Code: BAD_PASSWORD, Ref: ${referenceId}`)
        await writeAuditLog({
          actorId: user.id,
          actorRole: 'STUDENT',
          action: 'LOGIN_FAILURE',
          entity: 'User',
          entityId: user.id,
          details: { reason: 'BAD_PASSWORD' },
          ipAddress: ip,
        })
        return {
          error: 'Invalid credentials. Please verify your mobile number or Student ID and password.',
          ts: now,
          referenceId,
        }
      }

      // Check student enrollment status ONLY AFTER password check (prevents status discovery)
      if (student.enrollmentStatus !== 'ACTIVE') {
        console.warn(`[AUTH_BLOCKED] Inactive account. Code: INACTIVE, Status: ${student.enrollmentStatus}, Ref: ${referenceId}`)
        await writeAuditLog({
          actorId: user.id,
          actorRole: 'STUDENT',
          action: 'LOGIN_BLOCKED_INACTIVE',
          entity: 'Student',
          entityId: student.id,
          details: { status: student.enrollmentStatus, reason: 'INACTIVE' },
          ipAddress: ip,
        })
        return {
          error: 'Your student account is not active. Please contact the academy administration.',
          ts: now,
          referenceId,
        }
      }

      // Successful login
      await Promise.all([
        resetRateLimit(rateLimitIdentifierKey),
        resetRateLimit(rateLimitIpKey),
      ])

      const { token, expiresAt } = await createSession({
        userId: user.id,
        role: 'STUDENT',
        studentId: student.studentId,
        internalStudentId: student.id,
        ipAddress: ip,
      })

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))

      await writeAuditLog({
        actorId: user.id,
        actorRole: 'STUDENT',
        action: 'LOGIN_SUCCESS',
        entity: 'Session',
        ipAddress: ip,
      })

      redirect('/student')
    }
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error
    }
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message, ts: now, referenceId }
    }
    console.error(`[AUTH_ERROR] Code: DB_ERROR, Ref: ${referenceId}:`, error)
    return {
      error: `An unexpected authentication error occurred. (Reference: ${referenceId})`,
      ts: now,
      referenceId,
    }
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
 * Student Registration Action with OTP verification enforcement and minor consent
 */
export async function registerStudentAction(
  _prevState: unknown,
  formData: FormData
): Promise<AuthState | void> {
  const ip = await getClientIp()
  const now = Date.now()
  const referenceId = crypto.randomBytes(4).toString('hex')

  try {
    // 1. Rate limit registrations: max 5 attempts per hour per IP
    const rateLimit = await checkRateLimit(`register:${ip}`, 5, 3600)
    if (!rateLimit.allowed) {
      return {
        error: 'Too many registration requests from this network. Please try again later.',
        ts: now,
        referenceId,
      }
    }

    const validated = RegisterSchema.parse({
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      age: formData.get('age'),
      batchType: formData.get('batchType'),
      verificationToken: formData.get('verificationToken'),
      guardianName: formData.get('guardianName') || undefined,
      guardianPhone: formData.get('guardianPhone') || undefined,
      guardianConsent: formData.get('guardianConsent') || undefined,
    })

    // 2. Cryptographically verify the signed verification token
    const tokenValidation = verifyVerificationToken(validated.verificationToken, validated.phone, 'REGISTER')
    if (!tokenValidation.valid) {
      return {
        error: tokenValidation.error || 'Mobile number verification is required before registration.',
        ts: now,
        referenceId,
      }
    }

    // 3. Ensure phone uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { phone: validated.phone },
    })

    if (existingUser) {
      return {
        error: 'A student account with this mobile number already exists.',
        ts: now,
        referenceId,
      }
    }

    // 4. Hash the password with bcrypt (12 rounds)
    const passwordHash = await hashPassword(validated.password)

    let createdUserId = ''
    let createdStudentId = ''
    let assignedStudentId = ''

    // 5. Atomic sequential Student ID generation and record creation
    await prisma.$transaction(async (tx) => {
      assignedStudentId = await generateStudentId(tx)

      const newUser = await tx.user.create({
        data: {
          phone: validated.phone,
          passwordHash,
          role: 'STUDENT',
          phoneVerifiedAt: new Date(),
        },
      })

      const student = await tx.student.create({
        data: {
          studentId: assignedStudentId,
          userId: newUser.id,
          fullName: validated.fullName,
          age: validated.age,
          batchType: validated.batchType,
          enrollmentStatus: 'ACTIVE',
          guardianName: validated.guardianName || null,
          guardianPhone: validated.guardianPhone ? normalizePhone(validated.guardianPhone) : null,
          guardianConsent: Boolean(validated.guardianConsent),
          guardianConsentAt: validated.guardianConsent ? new Date() : null,
          consentVersion: validated.guardianConsent ? 'v1.0' : null,
        },
      })

      createdUserId = newUser.id
      createdStudentId = student.id
    })

    // 6. Create authenticated session
    const { token, expiresAt } = await createSession({
      userId: createdUserId,
      role: 'STUDENT',
      studentId: assignedStudentId,
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
      details: { studentId: assignedStudentId, batchType: validated.batchType },
      ipAddress: ip,
    })
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error
    }
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message, ts: now, referenceId }
    }
    console.error(`[REGISTRATION_ERROR] Ref: ${referenceId}:`, error)
    return {
      error: `Failed to complete registration. (Reference: ${referenceId})`,
      ts: now,
      referenceId,
    }
  }

  redirect('/student?welcome=true')
}

/**
 * Server action to request an OTP challenge.
 */
export async function requestOtpAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const ip = await getClientIp()
  const rawPhone = (formData.get('phone') as string) || ''
  const rawPurpose = (formData.get('purpose') as string) || 'REGISTER'

  try {
    const purposeParsed = OtpPurposeSchema.safeParse(rawPurpose)
    const purpose: OtpPurpose = purposeParsed.success ? purposeParsed.data : 'REGISTER'

    if (!isValidPhone(rawPhone)) {
      return { success: false, message: 'Please provide a valid Indian mobile number.' }
    }

    const normalized = normalizePhone(rawPhone)

    // Rate limits: 3 OTP requests per hour per phone, and 20 per hour per IP
    const [phoneLimit, ipLimit] = await Promise.all([
      checkRateLimit(`otp:phone:${normalized}`, 3, 3600),
      checkRateLimit(`otp:ip:${ip}`, 20, 3600),
    ])

    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return { success: false, message: 'Too many verification code requests. Please wait a while before requesting again.' }
    }

    return await requestOtpChallenge({
      phone: normalized,
      purpose,
      ipAddress: ip,
    })
  } catch (err) {
    console.error('[REQUEST_OTP_ERROR]', err)
    return { success: false, message: 'Failed to request verification code. Please try again.' }
  }
}

/**
 * Server action to verify an OTP challenge.
 */
export async function verifyOtpAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; remainingAttempts?: number; verificationToken?: string }> {
  const rawPhone = (formData.get('phone') as string) || ''
  const rawPurpose = (formData.get('purpose') as string) || 'REGISTER'
  const code = (formData.get('code') as string) || ''

  try {
    const purposeParsed = OtpPurposeSchema.safeParse(rawPurpose)
    const purpose: OtpPurpose = purposeParsed.success ? purposeParsed.data : 'REGISTER'

    if (!isValidPhone(rawPhone)) {
      return { success: false, message: 'Invalid phone number format.' }
    }

    const normalized = normalizePhone(rawPhone)
    return await verifyOtpChallenge({
      phone: normalized,
      purpose,
      code,
    })
  } catch (err) {
    console.error('[VERIFY_OTP_ERROR]', err)
    return { success: false, message: 'Verification could not be processed. Please try again.' }
  }
}

/**
 * Request Password Reset Action:
 * Initiates an OTP challenge for PASSWORD_RESET purpose.
 */
export async function requestPasswordResetAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const ip = await getClientIp()
  try {
    const validated = PasswordResetRequestSchema.parse({
      phone: formData.get('phone'),
    })

    const user = await prisma.user.findUnique({
      where: { phone: validated.phone },
    })

    if (!user) {
      // Return ambiguous message to prevent phone enumeration
      return {
        success: true,
        message: 'If an account exists with this mobile number, a verification code has been dispatched.',
        cooldownSeconds: 30,
      }
    }

    const rateLimit = await checkRateLimit(`pwd_reset:${validated.phone}`, 3, 3600)
    if (!rateLimit.allowed) {
      return { success: false, message: 'Too many reset attempts. Please wait an hour.' }
    }

    return await requestOtpChallenge({
      phone: validated.phone,
      purpose: 'PASSWORD_RESET',
      ipAddress: ip,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, message: err.issues[0].message }
    }
    return { success: false, message: 'Unable to initiate password reset.' }
  }
}

/**
 * Reset Password Action:
 * Consumes signed verificationToken, hashes new password with bcrypt, and revokes all active sessions.
 */
export async function resetPasswordAction(
  _prevState: unknown,
  formData: FormData
): Promise<AuthState> {
  const ip = await getClientIp()
  const now = Date.now()
  const referenceId = crypto.randomBytes(4).toString('hex')

  try {
    const validated = PasswordResetConfirmSchema.parse({
      phone: formData.get('phone'),
      verificationToken: formData.get('verificationToken'),
      newPassword: formData.get('newPassword'),
    })

    // Verify token
    const tokenCheck = verifyVerificationToken(validated.verificationToken, validated.phone, 'PASSWORD_RESET')
    if (!tokenCheck.valid) {
      return { error: tokenCheck.error || 'Invalid or expired reset token.', ts: now, referenceId }
    }

    const user = await prisma.user.findUnique({
      where: { phone: validated.phone },
    })

    if (!user) {
      return { error: 'Account not found.', ts: now, referenceId }
    }

    const passwordHash = await hashPassword(validated.newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Immediately revoke all existing sessions across devices
    await revokeAllUserSessions(user.id)

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
    })

    return { ts: now }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message, ts: now, referenceId }
    }
    console.error(`[PASSWORD_RESET_ERROR] Ref: ${referenceId}:`, error)
    return { error: `Failed to reset password. (Reference: ${referenceId})`, ts: now, referenceId }
  }
}
