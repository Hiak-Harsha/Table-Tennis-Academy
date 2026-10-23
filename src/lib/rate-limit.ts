interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory sliding window store (suitable for single-node / serverless instances, with interface ready for Upstash)
const rateLimitMap = new Map<string, RateLimitEntry>()

// Periodic garbage collection for expired entries
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60_000).unref?.()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Check and record an attempt against a rate limit window
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, {
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
 * Reset rate limit entry (e.g. after successful authentication)
 */
export async function resetRateLimit(key: string): Promise<void> {
  rateLimitMap.delete(key)
}
