import { z } from 'zod'

// Detect Next.js production build phase vs serverless runtime accurately
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  Boolean(process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.LAMBDA_TASK_ROOT) ||
  process.argv.some((arg) => arg.includes('next') && arg.includes('build'))

const KNOWN_INSECURE_SECRETS = new Set([
  'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod',
  'tta_secure_session_secret_signing_key_982347102938475618239401',
  '12345678901234567890123456789012',
  'dev_razorpay_webhook_secret_key_32_bytes_long',
])

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string (postgresql:// or postgres://)'
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
    APP_URL: z.string().optional().default('http://localhost:3000'),
    PORT: z.string().optional().default('3000'),
    AUTH_COOKIE_INSECURE_DEV: z.string().optional(),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z
      .string()
      .min(16, 'RAZORPAY_WEBHOOK_SECRET must be at least 16 characters')
      .default('dev_razorpay_webhook_secret_key_32_bytes_long'),
    UPI_VPA: z.string().default('tta.academy@upi'),
    UPI_MERCHANT_NAME: z.string().default('Table Tennis Academy'),
    SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_TEMPLATE_ID: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
    CRON_SECRET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isProduction = data.NODE_ENV === 'production'

    // Security constraints enforced strictly in production runtime
    if (isProduction && !isBuildPhase) {
      // 1. Enforce real, high-entropy SESSION_SECRET
      if (!data.SESSION_SECRET || KNOWN_INSECURE_SECRETS.has(data.SESSION_SECRET) || data.SESSION_SECRET.includes('insecure')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production runtime requires a unique, secure 32+ character SESSION_SECRET. Default and known insecure secrets are rejected.',
          path: ['SESSION_SECRET'],
        })
      }

      // 2. Reject mock/console SMS provider in production runtime
      if (data.SMS_PROVIDER === 'console') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production runtime requires a real SMS provider (msg91 or twilio). "console" is only permitted in development and test.',
          path: ['SMS_PROVIDER'],
        })
      }

      // 3. Enforce valid DATABASE_URL in production runtime
      if (!data.DATABASE_URL || data.DATABASE_URL.includes('build_placeholder')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production runtime requires a real PostgreSQL DATABASE_URL.',
          path: ['DATABASE_URL'],
        })
      }

      // 4. Enforce non-default RAZORPAY_WEBHOOK_SECRET if payments enabled
      if (data.RAZORPAY_KEY_ID && (!data.RAZORPAY_WEBHOOK_SECRET || KNOWN_INSECURE_SECRETS.has(data.RAZORPAY_WEBHOOK_SECRET))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production runtime requires a unique, secure RAZORPAY_WEBHOOK_SECRET when payments are enabled.',
          path: ['RAZORPAY_WEBHOOK_SECRET'],
        })
      }
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = JSON.stringify(parsed.error.format(), null, 2)
  console.error('❌ FATAL: Invalid environment configuration:\n', formatted)
  throw new Error(`FATAL: Invalid environment configuration:\n${formatted}`)
}

export const env = parsed.data
