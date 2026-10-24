import crypto from 'crypto'
import { z } from 'zod'
import prisma from './prisma'
import { normalizePhone } from './phone'
import { getSmsProvider } from './sms/provider'

export const OtpPurposeSchema = z.enum(['REGISTER', 'LOGIN', 'PASSWORD_RESET', 'STEP_UP'])
export type OtpPurpose = z.infer<typeof OtpPurposeSchema>

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000 // 30 seconds
const MAX_ATTEMPTS = 5
const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  const codeInt = crypto.randomInt(100000, 1000000)
  return codeInt.toString()
}

/**
 * Hashes an OTP code with a unique per-challenge salt using HMAC-SHA256.
 */
export function hashOtpCode(code: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(code).digest('hex')
}

/**
 * Verifies an OTP code using timing-safe comparison.
 */
export function verifyOtpCode(code: string, hash: string, salt: string): boolean {
  if (!code || !hash || !salt) return false
  const computed = hashOtpCode(code, salt)

  const bufA = Buffer.from(computed, 'utf8')
  const bufB = Buffer.from(hash, 'utf8')

  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Generates a signed verification token after successful OTP verification.
 * Binds the verified phone and purpose to future actions (e.g. registration).
 */
export function generateVerificationToken(phone: string, purpose: OtpPurpose, challengeId: string): string {
  const secret = process.env.SESSION_SECRET || 'fallback-secret-for-tokens-min-32-chars'
  const payload = {
    phone,
    purpose,
    challengeId,
    timestamp: Date.now(),
    expiresAt: Date.now() + VERIFICATION_TOKEN_TTL_MS,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')

  return `${payloadB64}.${signature}`
}

/**
 * Verifies and decodes a signed verification token.
 */
export function verifyVerificationToken(
  token: string,
  expectedPhone: string,
  expectedPurpose: OtpPurpose
): { valid: boolean; error?: string; challengeId?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Missing or malformed verification token.' }
  }

  const [payloadB64, signature] = token.split('.')
  const secret = process.env.SESSION_SECRET || 'fallback-secret-for-tokens-min-32-chars'

  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')

  const bufActual = Buffer.from(signature, 'utf8')
  const bufExpected = Buffer.from(expectedSig, 'utf8')

  if (bufActual.length !== bufExpected.length || !crypto.timingSafeEqual(bufActual, bufExpected)) {
    return { valid: false, error: 'Invalid verification token signature.' }
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Verification token has expired. Please verify your phone number again.' }
    }

    if (payload.phone !== expectedPhone) {
      return { valid: false, error: 'Verification token does not match this phone number.' }
    }

    if (payload.purpose !== expectedPurpose) {
      return { valid: false, error: 'Verification token is not valid for this action.' }
    }

    return { valid: true, challengeId: payload.challengeId }
  } catch {
    return { valid: false, error: 'Corrupt verification token payload.' }
  }
}

export interface RequestOtpParams {
  phone: string
  purpose: OtpPurpose
  ipAddress?: string
}

export interface RequestOtpResult {
  success: boolean
  message: string
  cooldownSeconds?: number
}

/**
 * Generates and dispatches a secure 6-digit OTP challenge.
 * Checks provider return value and does NOT create cooldown or report success if delivery fails.
 */
export async function requestOtpChallenge({
  phone,
  purpose,
  ipAddress,
}: RequestOtpParams): Promise<RequestOtpResult> {
  const normalizedPhone = normalizePhone(phone)
  const now = new Date()

  // 1. Check recent active challenge for resend cooldown (30 seconds)
  const recentChallenge = await prisma.otpChallenge.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      consumedAt: null,
      createdAt: {
        gte: new Date(now.getTime() - RESEND_COOLDOWN_MS),
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (recentChallenge) {
    const elapsedSeconds = Math.floor((now.getTime() - recentChallenge.createdAt.getTime()) / 1000)
    const waitSeconds = Math.max(1, 30 - elapsedSeconds)
    return {
      success: false,
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
      cooldownSeconds: waitSeconds,
    }
  }

  // 2. Generate cryptographically random code and salt
  const code = generateNumericOtp()
  const salt = crypto.randomBytes(16).toString('hex')
  const codeHash = hashOtpCode(code, salt)
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS)

  // 3. Dispatch OTP via SMS provider FIRST before committing challenge state
  const provider = getSmsProvider()
  const dispatchResult = await provider.sendOtp(normalizedPhone, code)

  if (!dispatchResult.success) {
    console.error(`[OTP_SEND_FAILURE] Provider ${provider.name} failed for ${normalizedPhone}:`, dispatchResult.error)
    return {
      success: false,
      message: 'Unable to deliver verification SMS right now. Please try again shortly.',
    }
  }

  // 4. Persist hashed challenge in the database
  await prisma.otpChallenge.create({
    data: {
      phone: normalizedPhone,
      purpose,
      codeHash,
      salt,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
      ipAddress: ipAddress || null,
    },
  })

  return {
    success: true,
    message: `A 6-digit security code has been sent to ${normalizedPhone}.`,
    cooldownSeconds: 30,
  }
}

export interface VerifyOtpParams {
  phone: string
  purpose: OtpPurpose
  code: string
}

export interface VerifyOtpResult {
  success: boolean
  message: string
  remainingAttempts?: number
  verificationToken?: string
}

/**
 * Authoritatively verifies an OTP challenge with atomic attempt counting,
 * constant-time comparison, expiration enforcement, and single-use invalidation.
 */
export async function verifyOtpChallenge({
  phone,
  purpose,
  code,
}: VerifyOtpParams): Promise<VerifyOtpResult> {
  const normalizedPhone = normalizePhone(phone)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    // Find the latest unconsumed challenge
    const challenge = await tx.otpChallenge.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!challenge) {
      return {
        success: false,
        message: 'No active verification code found. Please request a new code.',
      }
    }

    // Check expiration
    if (challenge.expiresAt < now) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      }
    }

    // Check max attempts
    if (challenge.attempts >= challenge.maxAttempts) {
      return {
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
        remainingAttempts: 0,
      }
    }

    // Atomically increment attempts counter in database
    const updatedChallenge = await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })

    // Timing-safe constant time verification
    const isValid = verifyOtpCode(code.trim(), challenge.codeHash, challenge.salt)

    if (!isValid) {
      const remaining = Math.max(0, updatedChallenge.maxAttempts - updatedChallenge.attempts)
      return {
        success: false,
        message: remaining > 0 ? `Incorrect code. ${remaining} attempts remaining.` : 'Too many incorrect attempts. Code invalidated.',
        remainingAttempts: remaining,
      }
    }

    // Mark challenge consumed (single-use)
    await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: now },
    })

    // Generate signed verification token bound to this phone and purpose
    const verificationToken = generateVerificationToken(normalizedPhone, purpose, challenge.id)

    return {
      success: true,
      message: 'Verification successful.',
      verificationToken,
    }
  })
}
