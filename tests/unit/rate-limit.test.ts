import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

vi.mock('@/lib/prisma', () => {
  const store = new Map<string, { key: string; count: number; resetAt: Date }>()

  const mockTx = {
    rateLimit: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        return store.get(where.key) || null
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { key: string }
          create: { key: string; count: number; resetAt: Date }
          update: { count: number; resetAt: Date }
        }) => {
          const existing = store.get(where.key)
          if (existing) {
            existing.count = update.count
            existing.resetAt = update.resetAt
            return existing
          }
          store.set(where.key, { ...create })
          return create
        }
      ),
      update: vi.fn(async ({ where, data }: { where: { key: string }; data: { count: { increment: number } } }) => {
        const item = store.get(where.key)!
        item.count += data.count.increment
        return item
      }),
      deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => {
        store.delete(where.key)
        return { count: 1 }
      }),
    },
  }

  return {
    default: {
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx)),
      rateLimit: mockTx.rateLimit,
    },
  }
})

describe('Rate Limiting (Postgres-backed with atomic transaction)', () => {
  const testKey = 'test-ip-127.0.0.1'

  beforeEach(async () => {
    await resetRateLimit(testKey)
  })

  it('should allow initial requests within limit', async () => {
    const res1 = await checkRateLimit(testKey, 3, 60)
    expect(res1.allowed).toBe(true)
    expect(res1.remaining).toBe(2)
    expect(res1.retryAfterSeconds).toBe(0)

    const res2 = await checkRateLimit(testKey, 3, 60)
    expect(res2.allowed).toBe(true)
    expect(res2.remaining).toBe(1)

    const res3 = await checkRateLimit(testKey, 3, 60)
    expect(res3.allowed).toBe(true)
    expect(res3.remaining).toBe(0)
  })

  it('should block requests that exceed the limit', async () => {
    await checkRateLimit(testKey, 2, 60)
    await checkRateLimit(testKey, 2, 60)

    const blocked = await checkRateLimit(testKey, 2, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('should allow resetting rate limit on successful auth', async () => {
    await checkRateLimit(testKey, 1, 60)
    const blocked = await checkRateLimit(testKey, 1, 60)
    expect(blocked.allowed).toBe(false)

    await resetRateLimit(testKey)

    const allowedAgain = await checkRateLimit(testKey, 1, 60)
    expect(allowedAgain.allowed).toBe(true)
  })
})
