import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-guard'
import { authorizeChannelSubscription, SubscriptionContext } from '@/lib/realtime/authz'
import { signRealtimeToken } from '@/lib/realtime/token'

export const dynamic = 'force-dynamic'

/**
 * Generates an authorized capability token for real-time channel subscriptions.
 * Enforces server-side channel authorization matrix before issuing subscription tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const channels = Array.isArray(body.channels) ? body.channels : []

    if (channels.length === 0) {
      return NextResponse.json({ error: 'No channels specified' }, { status: 400 })
    }

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

    // Authorize every requested channel
    for (const ch of channels) {
      const isAllowed = authorizeChannelSubscription(subContext, ch)
      if (!isAllowed) {
        return NextResponse.json(
          { error: `Unauthorized subscription to channel '${ch}'` },
          { status: 403 }
        )
      }
    }

    // Issue signed capability token
    const token = await signRealtimeToken({
      sub: user.id,
      role: user.role,
      channels,
    })

    return NextResponse.json({
      token,
      authorizedChannels: channels,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate token'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
