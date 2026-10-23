import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Match the env validation logic from src/lib/env.ts
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string'
      ),
    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters')
      .default('development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod'),
    PORT: z.string().optional().default('3000'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production' && data.SESSION_SECRET.includes('development-insecure')) {
        return false
      }
      return true
    },
    {
      message: 'A real 32+ character SESSION_SECRET is required in production.',
      path: ['SESSION_SECRET'],
    }
  )

describe('Phase 0: Environment Configuration & Safety Net', () => {
  it('should accept valid postgresql DATABASE_URL in development', () => {
    const valid = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/tabletennis',
      NODE_ENV: 'development',
    })
    expect(valid.success).toBe(true)
  })

  it('should accept postgres:// schema as valid PostgreSQL URL', () => {
    const valid = envSchema.safeParse({
      DATABASE_URL: 'postgres://user:pass@db.neon.tech/neondb?sslmode=require',
      NODE_ENV: 'development',
    })
    expect(valid.success).toBe(true)
  })

  it('should reject sqlite / file: URLs as invalid for PostgreSQL', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'file:./dev.db',
      NODE_ENV: 'development',
    })
    expect(result.success).toBe(false)
  })

  it('should reject insecure placeholder SESSION_SECRET in production', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/tta',
      NODE_ENV: 'production',
      SESSION_SECRET: 'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod',
    })
    expect(result.success).toBe(false)
  })

  it('should accept strong 32+ character SESSION_SECRET in production', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/tta',
      NODE_ENV: 'production',
      SESSION_SECRET: 'w9X$qL2mP8vK5tZ1yR4nB7jF0hC3sA6d',
    })
    expect(result.success).toBe(true)
  })
})
