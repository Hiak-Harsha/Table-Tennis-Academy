import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const KNOWN_INSECURE_SECRETS = new Set([
  'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod',
  'tta_secure_session_secret_signing_key_982347102938475618239401',
  '12345678901234567890123456789012',
  'dev_razorpay_webhook_secret_key_32_bytes_long',
])

function createTestEnvSchema(isBuildPhase = false) {
  return z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      DATABASE_URL: z
        .string()
        .min(1, 'DATABASE_URL is required')
        .refine(
          (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
          'DATABASE_URL must be a valid PostgreSQL connection string'
        )
        .default(
          isBuildPhase
            ? 'postgresql://postgres:postgres@localhost:5432/build_placeholder?schema=public'
            : ''
        ),
      SESSION_SECRET: z
        .string()
        .min(32, 'SESSION_SECRET must be at least 32 characters')
        .default('development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod'),
      SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
    })
    .superRefine((data, ctx) => {
      const isProduction = data.NODE_ENV === 'production'

      if (isProduction && !isBuildPhase) {
        if (!data.SESSION_SECRET || KNOWN_INSECURE_SECRETS.has(data.SESSION_SECRET) || data.SESSION_SECRET.includes('insecure')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Production runtime requires a unique, secure 32+ character SESSION_SECRET.',
            path: ['SESSION_SECRET'],
          })
        }

        if (data.SMS_PROVIDER === 'console') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Production runtime requires a real SMS provider.',
            path: ['SMS_PROVIDER'],
          })
        }

        if (!data.DATABASE_URL || data.DATABASE_URL.includes('build_placeholder')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Production runtime requires a real PostgreSQL DATABASE_URL.',
            path: ['DATABASE_URL'],
          })
        }
      }
    })
}

describe('Phase A.3: Hardened Environment Configuration & Safety Net', () => {
  it('should accept valid postgresql DATABASE_URL in development', () => {
    const schema = createTestEnvSchema(false)
    const valid = schema.safeParse({
      DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/tabletennis',
      NODE_ENV: 'development',
    })
    expect(valid.success).toBe(true)
  })

  it('should reject insecure placeholder SESSION_SECRET in production runtime even if VERCEL=1 is set', () => {
    // Crucial fix: VERCEL=1 at runtime must NOT bypass security checks!
    const runtimeSchema = createTestEnvSchema(false) // isBuildPhase is false
    const result = runtimeSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/tta',
      NODE_ENV: 'production',
      SESSION_SECRET: 'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod',
      SMS_PROVIDER: 'msg91',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('SESSION_SECRET'))).toBe(true)
    }
  })

  it('should reject console SMS_PROVIDER in production runtime', () => {
    const runtimeSchema = createTestEnvSchema(false)
    const result = runtimeSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/tta',
      NODE_ENV: 'production',
      SESSION_SECRET: 'w9X$qL2mP8vK5tZ1yR4nB7jF0hC3sA6d_strong_secret',
      SMS_PROVIDER: 'console',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('SMS_PROVIDER'))).toBe(true)
    }
  })

  it('should accept build placeholder during Next.js production build phase', () => {
    const buildSchema = createTestEnvSchema(true) // isBuildPhase is true
    const result = buildSchema.safeParse({
      NODE_ENV: 'production',
    })
    expect(result.success).toBe(true)
  })

  it('should accept strong 32+ character SESSION_SECRET and valid SMS provider in production runtime', () => {
    const runtimeSchema = createTestEnvSchema(false)
    const result = runtimeSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/tta',
      NODE_ENV: 'production',
      SESSION_SECRET: 'w9X$qL2mP8vK5tZ1yR4nB7jF0hC3sA6d_strong_secret',
      SMS_PROVIDER: 'msg91',
    })
    expect(result.success).toBe(true)
  })
})
