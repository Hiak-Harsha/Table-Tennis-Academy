'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { ChatMessageSchema } from '@/lib/validations'
import { validateUploadedFile } from '@/lib/file-security'
import { saveUploadedFile } from '@/lib/storage'
import { realtimeBus } from '@/lib/realtime/bus'
import { getDmChannelName } from '@/lib/realtime/authz'
import { z } from 'zod'

export interface ChatMessageResult {
  id: string
  clientMsgId: string | null
  content: string | null
  senderId: string | null
  senderName: string
  isAdmin: boolean
  category: string
  batchType: string | null
  recipientId: string | null
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  status: string
  createdAt: Date
}

/**
 * Sends a chat message with idempotency, file attachment validation,
 * role authorization, and immediate real-time dispatch.
 */
export async function sendChatMessageAction(formData: FormData) {
  try {
    const session = await requireAuth()

    // Validate and sanitize text parameters
    const validated = ChatMessageSchema.parse({
      content: formData.get('content'),
      category: formData.get('category'),
      batchType: formData.get('batchType') || undefined,
      recipientId: formData.get('recipientId') || undefined,
    })

    const clientMsgId = (formData.get('clientMsgId') as string) || undefined

    // Idempotent deduplication using client-generated message ID
    if (clientMsgId) {
      const existing = await prisma.chatMessage.findUnique({
        where: { clientMsgId },
      })
      if (existing) {
        return { success: true, message: existing }
      }
    }

    const file = formData.get('file') as File | null
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null

    if (file && file.size > 0) {
      const validation = await validateUploadedFile(file)
      if (!validation.valid) {
        return { error: validation.error }
      }

      const stored = await saveUploadedFile({
        storageKey: validation.storageKey,
        buffer: validation.buffer,
        mimeType: validation.mimeType,
      })

      fileUrl = stored.fileUrl
      fileName = validation.sanitizedOriginalName
      fileType = validation.fileType
    }

    if (!validated.content && !fileUrl) {
      return { error: 'Message payload cannot be empty.' }
    }

    let senderName = 'Academy Admin'
    let senderId: string | null = null
    let authoritativeBatchType = validated.batchType

    if (session.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: session.id } })
      if (!student) {
        return { error: 'Athlete profile not found.' }
      }
      senderName = student.fullName
      senderId = student.id

      // SECURITY: If BATCH, force authoritative student batchType
      if (validated.category === 'BATCH') {
        if (!student.batchType) {
          return { error: 'Unauthorized: Athlete has no assigned training tier.' }
        }
        authoritativeBatchType = student.batchType
      }
    }

    const created = await prisma.chatMessage.create({
      data: {
        clientMsgId,
        content: validated.content,
        category: validated.category,
        batchType: authoritativeBatchType,
        recipientId: validated.recipientId,
        senderName,
        senderId,
        isAdmin: session.role === 'ADMIN',
        fileUrl,
        fileName,
        fileType,
        status: 'SENT',
      },
    })

    // Instant Real-Time Event Dispatching (<50ms)
    let channel = 'global'
    if (validated.category === 'BATCH' && authoritativeBatchType) {
      channel = `batch:${authoritativeBatchType}`
    } else if (validated.category === 'PRIVATE' && validated.recipientId) {
      const myParticipantId = senderId || 'ADMIN'
      channel = getDmChannelName(myParticipantId, validated.recipientId)
    }

    realtimeBus.publish(channel, 'chat.message', {
      message: {
        id: created.id,
        clientMsgId: created.clientMsgId,
        content: created.content,
        senderName: created.senderName,
        senderId: created.senderId,
        isAdmin: created.isAdmin,
        category: created.category,
        batchType: created.batchType,
        recipientId: created.recipientId,
        fileUrl: created.fileUrl,
        fileName: created.fileName,
        fileType: created.fileType,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    })

    revalidatePath('/student/connect')
    revalidatePath('/admin/chat')
    return { success: true, message: created }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Transmission failed.' }
  }
}

/**
 * Retrieves chat messages for a channel with strict batch privacy
 * and cursor pagination showing the most recent messages.
 */
export async function getChatMessagesAction(params: {
  category: string
  batchType?: string
  recipientId?: string
  cursor?: string
  limit?: number
}): Promise<ChatMessageResult[]> {
  try {
    const session = await requireAuth()

    const where: any = { category: params.category }

    if (params.category === 'BATCH') {
      if (session.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: session.id } })
        if (!student?.batchType) return []
        // Strictly use student's assigned batchType; prevent eavesdropping on other batches
        where.batchType = student.batchType
      } else {
        // Admin can view any batch
        where.batchType = params.batchType
      }
    } else if (params.category === 'PRIVATE') {
      if (!params.recipientId) return []

      const student =
        session.role === 'STUDENT'
          ? await prisma.student.findUnique({ where: { userId: session.id } })
          : null
      const currentId = session.role === 'ADMIN' ? 'ADMIN' : student?.id

      if (!currentId) return []

      // Filter for messages between these two participants
      if (session.role === 'ADMIN') {
        where.OR = [
          { isAdmin: true, recipientId: params.recipientId },
          { senderId: params.recipientId, recipientId: 'ADMIN' },
        ]
      } else {
        where.OR = [
          { senderId: currentId, recipientId: params.recipientId },
          { senderId: params.recipientId, recipientId: currentId },
        ]
      }
    }

    const limit = Math.min(params.limit || 50, 100)

    // Cursor pagination: fetch latest messages in descending order, then reverse to chronological
    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    })

    // Return chronological order (oldest to newest) for proper chat window rendering
    return messages.reverse()
  } catch (err) {
    console.warn('[CHAT] Error fetching messages:', err)
    return []
  }
}

/**
 * Retrieves chat recipient list.
 * Students receive Coach/Admin + peers in their OWN batch ONLY.
 * Admins receive all students.
 */
export async function getChatRecipientsAction() {
  try {
    const session = await requireAuth()

    if (session.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: session.id } })
      if (!student) return []

      const peers = await prisma.student.findMany({
        where: {
          batchType: student.batchType,
          id: { not: student.id },
          enrollmentStatus: 'ACTIVE',
        },
        select: { id: true, fullName: true, studentId: true, batchType: true },
        orderBy: { fullName: 'asc' },
      })

      const recipients = peers.map((s) => ({
        id: s.id,
        name: s.fullName,
        sub: `${s.batchType} Peer`,
        type: 'STUDENT',
      }))

      // Prepend official Academy Admin/Coach desk
      recipients.unshift({
        id: 'ADMIN',
        name: 'Coach & Academy Desk',
        sub: 'Official Support',
        type: 'ADMIN',
      })

      return recipients
    }

    // Admin role: lists all active students
    const students = await prisma.student.findMany({
      where: { enrollmentStatus: 'ACTIVE' },
      select: { id: true, fullName: true, studentId: true, batchType: true },
      orderBy: { fullName: 'asc' },
    })

    return students.map((s) => ({
      id: s.id,
      name: s.fullName,
      sub: `${s.batchType} (${s.studentId})`,
      type: 'STUDENT',
    }))
  } catch (err) {
    console.warn('[CHAT] Error fetching recipients:', err)
    return []
  }
}

/**
 * Mark messages as read and broadcast read receipts
 */
export async function markMessagesReadAction(params: { messageIds: string[]; channel: string }) {
  try {
    const session = await requireAuth()
    if (!params.messageIds || params.messageIds.length === 0) return { success: true }

    await prisma.$transaction([
      prisma.chatMessage.updateMany({
        where: {
          id: { in: params.messageIds },
          status: 'SENT',
        },
        data: { status: 'READ' },
      }),
      prisma.chatReadReceipt.createMany({
        data: params.messageIds.map((msgId) => ({
          messageId: msgId,
          userId: session.id,
        })),
        skipDuplicates: true,
      }),
    ])

    realtimeBus.publish(params.channel, 'chat.read', {
      messageIds: params.messageIds,
      readerUserId: session.id,
    })

    return { success: true }
  } catch (err) {
    console.warn('[CHAT] Failed to mark read:', err)
    return { success: false }
  }
}

/**
 * Broadcast temporary typing indicator
 */
export async function sendTypingIndicatorAction(params: { channel: string }) {
  try {
    const session = await requireAuth()
    realtimeBus.publish(params.channel, 'chat.typing', {
      userId: session.id,
      timestamp: Date.now(),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

/**
 * Retrieves total unread message count for the authenticated user
 */
export async function getUnreadChatCountAction(): Promise<number> {
  try {
    const session = await requireAuth()

    if (session.role === 'ADMIN') {
      return await prisma.chatMessage.count({
        where: {
          recipientId: 'ADMIN',
          status: 'SENT',
        },
      })
    }

    const student = await prisma.student.findUnique({ where: { userId: session.id } })
    if (!student) return 0

    return await prisma.chatMessage.count({
      where: {
        recipientId: student.id,
        status: 'SENT',
      },
    })
  } catch {
    return 0
  }
}
