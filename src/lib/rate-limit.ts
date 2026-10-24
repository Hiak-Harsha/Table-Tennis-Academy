import prisma from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

interface InMemoryEntry {
  count: number
  resetAt: number
}

// In-memory fallback map when database is unavailable (e.g. offline tests)
const inMemoryStore = new Map<string, InMemoryEntry>()

function checkInMemoryRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const entry = inMemoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    }
  }

  if (entry.count >= maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
    }
  }

  entry.count += 1
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    retryAfterSeconds: 0,
  }
}

/**
 * Check and record an attempt against a rate limit window.
 * Backed durably by the Postgres RateLimit table for multi-instance serverless consistency,
 * with graceful in-memory fallback.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date()
  const windowMs = windowSeconds * 1000
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({
        where: { key },
      })

      // Expired or new window
      if (!existing || existing.resetAt < now) {
        await tx.rateLimit.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        })
        return {
          allowed: true,
          remaining: maxAttempts - 1,
          retryAfterSeconds: 0,
        }
      }

      // Max attempts exceeded
      if (existing.count >= maxAttempts) {
        const retryAfter = Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, retryAfter),
        }
      }

      // Increment count
      const updated = await tx.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      })

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - updated.count),
        retryAfterSeconds: 0,
      }
    })

    return result
  } catch {
    // If DB is unreachable or in non-DB unit test, fallback in memory
    return checkInMemoryRateLimit(key, maxAttempts, windowSeconds)
  }
}

/**
 * Reset rate limit entry (e.g. after successful authentication)
 */
export async function resetRateLimit(key: string): Promise<void> {
  inMemoryStore.delete(key)
  try {
    await prisma.rateLimit.deleteMany({
      where: { key },
    })
  } catch {
    // Ignore if DB is unreachable
  }
}

/**
 * Platform-trusted client IP extraction
 * Assumptions:
 * 1. On Vercel, x-vercel-forwarded-for is set by the edge network and cannot be spoofed.
 * 2. On standard proxies, x-forwarded-for first hop is used.
 */
export function extractClientIp(headersMap: Headers): string {
  const vercelIp = headersMap.get('x-vercel-forwarded-for')
  if (vercelIp) {
    return vercelIp.split(',')[0].trim()
  }

  const forwarded = headersMap.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return headersMap.get('x-real-ip') || '127.0.0.1'
}
