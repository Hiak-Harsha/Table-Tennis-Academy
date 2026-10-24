import { describe, it, expect } from 'vitest'
import { normalizePhone } from '@/lib/phone'
import { z } from 'zod'

describe('Phase A.0: Authentication Failure Reproduction', () => {
  // A1: Phone format mismatch between write (E.164) and read (raw typed)
  it('reproduces A1: raw 10-digit login input fails to match E.164 stored phone in direct lookup', () => {
    // When a student registers, phone is normalized to E.164
    const registeredPhone = normalizePhone('9876543210') // '+919876543210'

    // At login, the user types a 10-digit number
    const loginInput = '9876543210'

    // Direct match (the current bug in unifiedLoginAction line 170)
    const directMatch = loginInput === registeredPhone
    expect(directMatch).toBe(false) // Demonstrates why 10-digit input fails to find the student
  })

  // A3: VERCEL=1 runtime environment bypasses production security checks
  it('reproduces A3: VERCEL=1 flag mistakenly marks runtime as build-time', () => {
    // Current bug in src/lib/env.ts:
    // const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.VERCEL === '1'
    const simulateCurrentIsBuildTime = (env: Record<string, string | undefined>) => {
      return (
        env.NEXT_PHASE === 'phase-production-build' ||
        env.VERCEL === '1' ||
        env.CI === 'true'
      )
    }

    // In a live Vercel serverless function, VERCEL is '1' but NEXT_PHASE is not 'phase-production-build'
    const vercelRuntimeEnv = {
      NODE_ENV: 'production',
      VERCEL: '1',
      SESSION_SECRET: 'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod',
    }

    const isBuildTimeAtRuntime = simulateCurrentIsBuildTime(vercelRuntimeEnv)
    // The bug: it thinks it is build time when running on Vercel
    expect(isBuildTimeAtRuntime).toBe(true)

    // And because isBuildTime is true, the security check is skipped!
    const securityCheckSkipped = isBuildTimeAtRuntime
    expect(securityCheckSkipped).toBe(true)
  })

  // B1: Registration action does not enforce OTP verification token
  it('reproduces B1: registration schema currently does not require verificationToken', async () => {
    // In src/actions/auth.ts, RegisterSchema only requires:
    // fullName, phone, password, age, batchType
    // Notice verificationToken is completely absent!
    const CurrentRegisterSchema = z.object({
      fullName: z.string().min(2),
      phone: z.string().min(10),
      password: z.string().min(8),
      age: z.preprocess((v) => Number(v), z.number()),
      batchType: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    })

    const payloadWithoutOtp = {
      fullName: 'Test Athlete',
      phone: '9876543210',
      password: 'password123',
      age: 18,
      batchType: 'BEGINNER',
    }

    // It passes without any verification token!
    const parsed = CurrentRegisterSchema.safeParse(payloadWithoutOtp)
    expect(parsed.success).toBe(true)
  })
})
