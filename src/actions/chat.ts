'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAny } from '@/lib/auth-utils'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const ChatSchema = z.object({
  content: z.string().max(1000).optional(),
  category: z.enum(['GLOBAL', 'BATCH', 'PRIVATE']),
  batchType: z.string().optional(),
  recipientId: z.string().optional(),
})

export async function sendChatMessageAction(formData: FormData) {
  try {
    const session = await requireAny()
    
    // Validate basics
    const validated = ChatSchema.parse({
      content: formData.get('content'),
      category: formData.get('category'),
      batchType: formData.get('batchType') || undefined,
      recipientId: formData.get('recipientId') || undefined
    })

    const file = formData.get('file') as File | null
    let fileUrl = null
    let fileName = null
    let fileType = null

    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5MB)' }
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uniqueName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadDir, { recursive: true })
      await fs.writeFile(path.join(uploadDir, uniqueName), buffer)
      fileUrl = `/uploads/${uniqueName}`
      fileName = file.name
      fileType = file.type.startsWith('image/') ? 'IMAGE' : file.type === 'application/pdf' ? 'PDF' : 'DOCUMENT'
    }

    if (!validated.content && !fileUrl) return { error: 'Message payload cannot be empty.' }

    const senderName = session.role === 'ADMIN' ? 'Academy Admin' : (await prisma.student.findUnique({ where: { userId: session.id } }))?.fullName || 'Athlete'
    const senderId = session.role === 'STUDENT' ? (await prisma.student.findUnique({ where: { userId: session.id } }))?.id : null

    // SECURITY: If BATCH, verify student belongs to that batch
    if (validated.category === 'BATCH' && session.role === 'STUDENT') {
       const student = await prisma.student.findUnique({ where: { userId: session.id } })
       if (student?.batchType !== validated.batchType) return { error: 'Unauthorized: Batch synchronization violation.' }
    }

    await prisma.chatMessage.create({
      data: {
        content: validated.content,
        category: validated.category,
        batchType: validated.batchType,
        recipientId: validated.recipientId,
        senderName: senderName,
        senderId: senderId,
        isAdmin: session.role === 'ADMIN',
        fileUrl, fileName, fileType
      }
    })

    revalidatePath('/student/connect')
    revalidatePath('/admin/chat')
    return { success: true }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Transmission failed.' }
  }
}

export async function getChatMessagesAction(params: { category: string, batchType?: string, recipientId?: string }) {
  try {
    const session = await requireAny()
    
    let where: any = { category: params.category }

    if (params.category === 'BATCH') {
      where.batchType = params.batchType
    } else if (params.category === 'PRIVATE') {
      if (!params.recipientId) return []
      
      const student = session.role === 'STUDENT' ? (await prisma.student.findUnique({ where: { userId: session.id } })) : null
      const currentId = session.role === 'ADMIN' ? 'ADMIN' : student?.id
      
      if (!currentId) return []

      // Filter for messages where (sender=Me AND recipient=Them) OR (sender=Them AND recipient=Me)
      where = {
        category: 'PRIVATE',
        OR: [
          { senderId: currentId, recipientId: params.recipientId },
          { senderId: params.recipientId, recipientId: currentId }
        ]
      }
      // If Admin is involved, use isAdmin flag instead of senderId for Me check
      if (session.role === 'ADMIN') {
        where.OR = [
          { isAdmin: true, recipientId: params.recipientId },
          { senderId: params.recipientId, recipientId: 'ADMIN' }
        ]
      }
    }

    return await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100
    })
  } catch (e) {
    return []
  }
}

export async function getChatRecipientsAction() {
  try {
    const session = await requireAny()
    // Admin gets all students, Student gets Admin + all other students
    const students = await prisma.student.findMany({
      select: { id: true, fullName: true, studentId: true, batchType: true }
    })
    
    const recipients = students.map((s: any) => ({
      id: s.id,
      name: s.fullName,
      sub: `${s.batchType} Tier`,
      type: 'STUDENT'
    }))

    if (session.role === 'STUDENT') {
      recipients.unshift({ id: 'ADMIN', name: 'Academy Admin', sub: 'Official Support', type: 'ADMIN' })
    }

    return recipients.filter((r: any) => {
       if (session.role === 'STUDENT') {
         // Don't include self
         return true 
       }
       return true
    })
  } catch (e) {
    return []
  }
}
