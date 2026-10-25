'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'

export async function getNotificationsAction() {
  try {
    const session = await requireAuth()

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.id, isRead: false },
    })

    return {
      userId: session.id,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    }
  } catch {
    return { userId: null, notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await requireAuth()

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: session.id },
      data: { isRead: true },
    })

    revalidatePath('/student')
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await requireAuth()

    await prisma.notification.updateMany({
      where: { userId: session.id, isRead: false },
      data: { isRead: true },
    })

    revalidatePath('/student')
    return { success: true }
  } catch {
    return { success: false }
  }
}
