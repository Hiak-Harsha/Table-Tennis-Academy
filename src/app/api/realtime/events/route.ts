import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { SESSION_COOKIE_NAME, validateSession } from '@/lib/session'
import { realtimeBus } from '@/lib/realtime/bus'
import { authorizeChannelSubscription, SubscriptionContext } from '@/lib/realtime/authz'
import { RealtimeMessage } from '@/lib/realtime/events'

export const dynamic = 'force-dynamic'

/**
 * Server-Sent Events (SSE) Streaming Route for Real-Time Academy Updates.
 * Features:
 * - Server-side channel authorization (403 if attempting to listen to unauthorized channels)
 * - Automatic missed message backfilling using Last-Event-ID header
 * - 15-second heartbeat keeping connection alive through NAT proxies
 * - Sub-second (<50ms) message dispatch from process event bus
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Parse requested channels
  const searchParams = req.nextUrl.searchParams
  const channelsParam = searchParams.get('channels') || 'global'
  const requestedChannels = channelsParam
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  if (requestedChannels.length === 0) {
    return NextResponse.json({ error: 'No channels specified' }, { status: 400 })
  }

  // Load user context for channel authorization
  let batchType: string | null = null
  let studentId: string | null = null
  let internalStudentId: string | null = null

  if (session.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: session.id },
      select: { id: true, studentId: true, batchType: true },
    })
    if (student) {
      batchType = student.batchType
      studentId = student.studentId
      internalStudentId = student.id
    }
  }

  const subContext: SubscriptionContext = {
    userId: session.id,
    role: session.role as 'ADMIN' | 'STUDENT',
    studentId,
    internalStudentId,
    batchType,
  }

  // Authorize every requested channel
  for (const ch of requestedChannels) {
    const isAllowed = authorizeChannelSubscription(subContext, ch)
    if (!isAllowed) {
      console.warn(`[REALTIME_AUTHZ] User ${session.id} denied subscription to channel: ${ch}`)
      return NextResponse.json(
        { error: `Forbidden: unauthorized subscription to channel '${ch}'` },
        { status: 403 }
      )
    }
  }

  const encoder = new TextEncoder()
  const lastEventId = req.headers.get('last-event-id') || searchParams.get('lastEventId')

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection acknowledgement
      controller.enqueue(encoder.encode(`:connected channels=${requestedChannels.join(',')}\n\n`))

      // 2. Replay backfill if client reconnects with Last-Event-ID
      if (lastEventId) {
        const missed = realtimeBus.getEventsSince(lastEventId, requestedChannels)
        for (const msg of missed) {
          const sseChunk = `id: ${msg.id}\nevent: ${msg.type}\ndata: ${JSON.stringify(msg)}\n\n`
          controller.enqueue(encoder.encode(sseChunk))
        }
      }

      // 3. Subscribe to active event bus for real-time dispatches
      const unsubscribe = realtimeBus.subscribe(requestedChannels, (msg: RealtimeMessage) => {
        try {
          const sseChunk = `id: ${msg.id}\nevent: ${msg.type}\ndata: ${JSON.stringify(msg)}\n\n`
          controller.enqueue(encoder.encode(sseChunk))
        } catch {
          // Stream controller closed
        }
      })

      // 4. Ping heartbeat interval (15 seconds)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':ping\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      // 5. Cleanup on connection termination or client abort
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering in Nginx
    },
  })
}
