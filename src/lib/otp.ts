import crypto from 'crypto'
import prisma from './prisma'
import { normalizePhone } from './phone'
import { getSmsProvider } from './sms/provider'

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'STEP_UP'

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000 // 30 seconds
const MAX_ATTEMPTS = 5

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

  // 3. Persist hashed challenge in the database
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

  // 4. Dispatch OTP via SMS provider
  const provider = getSmsProvider()
  await provider.sendOtp(normalizedPhone, code)

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
}

/**
 * Authoritatively verifies an OTP challenge with constant-time comparison,
 * attempt counting, expiration enforcement, and single-use invalidation.
 */
export async function verifyOtpChallenge({
  phone,
  purpose,
  code,
}: VerifyOtpParams): Promise<VerifyOtpResult> {
  const normalizedPhone = normalizePhone(phone)
  const now = new Date()

  // Find the latest unconsumed challenge
  const challenge = await prisma.otpChallenge.findFirst({
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

  // Increment attempts counter in database
  const updatedChallenge = await prisma.otpChallenge.update({
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

  // Invalidate challenge upon successful verification (single-use)
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  })

  return {
    success: true,
    message: 'Verification successful.',
  }
}
