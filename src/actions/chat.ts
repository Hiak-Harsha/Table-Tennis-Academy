'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAny } from '@/lib/auth-guard'
import { ChatMessageSchema } from '@/lib/validations'
import { validateUploadedFile } from '@/lib/file-security'
import { saveUploadedFile } from '@/lib/storage'
import { realtimeBus } from '@/lib/realtime/bus'
import { getDmChannelName } from '@/lib/realtime/authz'
import { z } from 'zod'

export async function sendChatMessageAction(formData: FormData) {
  try {
    const session = await requireAny()

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

    const senderName =
      session.role === 'ADMIN'
        ? 'Academy Admin'
        : (await prisma.student.findUnique({ where: { userId: session.id } }))?.fullName || 'Athlete'
    const senderId =
      session.role === 'STUDENT'
        ? (await prisma.student.findUnique({ where: { userId: session.id } }))?.id
        : null

    // SECURITY: If BATCH, verify student belongs to that batch
    if (validated.category === 'BATCH' && session.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: session.id } })
      if (student?.batchType !== validated.batchType) {
        return { error: 'Unauthorized: Batch synchronization violation.' }
      }
    }

    const created = await prisma.chatMessage.create({
      data: {
        clientMsgId,
        content: validated.content,
        category: validated.category,
        batchType: validated.batchType,
        recipientId: validated.recipientId,
        senderName: senderName,
        senderId: senderId,
        isAdmin: session.role === 'ADMIN',
        fileUrl,
        fileName,
        fileType,
        status: 'SENT',
      },
    })

    // Instant Real-Time Event Dispatching (<50ms)
    let channel = 'global'
    if (validated.category === 'BATCH' && validated.batchType) {
      channel = `batch:${validated.batchType}`
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

export async function getChatMessagesAction(params: {
  category: string
  batchType?: string
  recipientId?: string
  cursor?: string
  limit?: number
}) {
  try {
    const session = await requireAny()

    const where: any = { category: params.category }

    if (params.category === 'BATCH') {
      where.batchType = params.batchType
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

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    })

    return messages
  } catch {
    return []
  }
}

export async function getChatRecipientsAction() {
  try {
    const session = await requireAny()
    const students = await prisma.student.findMany({
      select: { id: true, fullName: true, studentId: true, batchType: true },
    })

    const recipients = students.map((s: any) => ({
      id: s.id,
      name: s.fullName,
      sub: `${s.batchType} Tier`,
      type: 'STUDENT',
    }))

    if (session.role === 'STUDENT') {
      recipients.unshift({ id: 'ADMIN', name: 'Academy Admin', sub: 'Official Support', type: 'ADMIN' })
    }

    return recipients
  } catch {
    return []
  }
}

/**
 * Mark messages as read and broadcast read receipts
 */
export async function markMessagesReadAction(params: { messageIds: string[]; channel: string }) {
  try {
    const session = await requireAny()
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
    const session = await requireAny()
    realtimeBus.publish(params.channel, 'chat.typing', {
      userId: session.id,
      timestamp: Date.now(),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
