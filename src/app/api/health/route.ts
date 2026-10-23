import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  try {
    // 1. Perform database ping query
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - startTime

    const memoryUsage = process.memoryUsage()

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        service: 'tta-portal',
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: 'connected',
          latencyMs,
        },
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    const latencyMs = Date.now() - startTime
    logger.error('Healthcheck DB ping failed', error, { latencyMs })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        service: 'tta-portal',
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: 'disconnected',
          latencyMs,
          error: error instanceof Error ? error.message : 'Database ping failure',
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  }
}

export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new Response(null, { status: 200 })
  } catch {
    return new Response(null, { status: 503 })
  }
}
