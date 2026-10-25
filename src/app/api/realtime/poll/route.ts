import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-guard'
import { authorizeChannelSubscription, SubscriptionContext } from '@/lib/realtime/authz'

export const dynamic = 'force-dynamic'

/**
 * Database-backed short-polling fallback route.
 * Essential for Serverless (Vercel) deployments where SSE connections are dropped
 * or cross-instance in-memory pub/sub is not shared.
 * Clients poll this endpoint every 5-10s when SSE is disconnected.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const channelsParam = searchParams.get('channels') || 'global'
    const sinceParam = searchParams.get('since')

    const channels = channelsParam
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    let batchType: string | null = null
    let studentId: string | null = null
    let internalStudentId: string | null = null

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true, studentId: true, batchType: true },
      })
      if (student) {
        batchType = student.batchType
        studentId = student.studentId
        internalStudentId = student.id
      }
    }

    const subContext: SubscriptionContext = {
      userId: user.id,
      role: user.role as 'ADMIN' | 'STUDENT',
      studentId,
      internalStudentId,
      batchType,
    }

    // Verify all requested channels are legally permitted
    for (const ch of channels) {
      if (!authorizeChannelSubscription(subContext, ch)) {
        return NextResponse.json(
          { error: `Unauthorized subscription to channel '${ch}'` },
          { status: 403 }
        )
      }
    }

    // Parse since timestamp (default to last 30 seconds if omitted)
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 30 * 1000)

    // Build channel queries for chat messages
    const channelConditions: any[] = []
    for (const ch of channels) {
      if (ch === 'global') {
        channelConditions.push({ category: 'GLOBAL' })
      } else if (ch.startsWith('batch:')) {
        const bType = ch.slice(6)
        channelConditions.push({ category: 'BATCH', batchType: bType })
      } else if (ch.startsWith('dm:')) {
        const parts = ch.slice(3).split(':')
        if (parts.length === 2) {
          channelConditions.push({
            category: 'PRIVATE',
            OR: [
              { senderId: parts[0], recipientId: parts[1] },
              { senderId: parts[1], recipientId: parts[0] },
            ],
          })
        }
      }
    }

    const messages =
      channelConditions.length > 0
        ? await prisma.chatMessage.findMany({
            where: {
              createdAt: { gt: sinceDate },
              OR: channelConditions,
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
          })
        : []

    // Fetch user notifications since timestamp
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    return NextResponse.json({
      messages,
      notifications,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Polling failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
