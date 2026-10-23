import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, HEAD } from '@/app/api/health/route'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}))

describe('Healthcheck API Endpoint (/api/health)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns status 200 and healthy payload when database is accessible', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }] as any)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.service).toBe('tta-portal')
    expect(body.database.status).toBe('connected')
    expect(typeof body.database.latencyMs).toBe('number')
    expect(typeof body.uptimeSeconds).toBe('number')
  })

  it('returns status 503 and unhealthy payload when database throws', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))

    const response = await GET()
    expect(response.status).toBe(503)

    const body = await response.json()
    expect(body.status).toBe('unhealthy')
    expect(body.database.status).toBe('disconnected')
    expect(body.database.error).toBe('Connection terminated unexpectedly')
  })

  it('handles HEAD request returning 200 on healthy database', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }] as any)

    const response = await HEAD()
    expect(response.status).toBe(200)
  })

  it('handles HEAD request returning 503 on database failure', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Pool timeout'))

    const response = await HEAD()
    expect(response.status).toBe(503)
  })
})
