import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string (postgresql:// or postgres://)'
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

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = JSON.stringify(parsed.error.format(), null, 2)
  console.error('❌ Invalid environment variables:\n', formatted)
  throw new Error(`Invalid environment variables:\n${formatted}`)
}

export const env = parsed.data
