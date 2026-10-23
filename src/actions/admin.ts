'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAny } from '@/lib/auth-guard'
import { hashPassword } from '@/lib/password'
import { rupeesToPaise } from '@/lib/currency'
import {
  StudentRegistrationSchema,
  TournamentSchema,
  BroadcastSchema,
} from '@/lib/validations'
import { realtimeBus } from '@/lib/realtime/bus'
import { z } from 'zod'

export async function createStudentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()

    // Validate inputs
    const validated = StudentRegistrationSchema.parse({
      name: formData.get('name'),
      batch: formData.get('batch'),
      age: formData.get('age'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      coachName: formData.get('coachName') || undefined,
      contactDetails: formData.get('contactDetails') || undefined,
    })

    const studentIdStr = 'TTA-' + Math.floor(1000 + Math.random() * 9000)

    const existing = await prisma.user.findUnique({ where: { phone: validated.phone } })
    if (existing) return { error: `Phone number ${validated.phone} is already registered.` }

    const hashedPassword = await hashPassword(validated.password)

    await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          phone: validated.phone,
          passwordHash: hashedPassword,
          role: 'STUDENT',
        },
      })

      await tx.student.create({
        data: {
          studentId: studentIdStr,
          userId: newUser.id,
          fullName: validated.name,
          age: validated.age,
          batchType: validated.batch,
          coachName: validated.coachName || null,
          contactDetails: validated.contactDetails || null,
          enrollmentStatus: 'ACTIVE',
        },
      })
    })

    revalidatePath('/admin/students')
    revalidatePath('/admin')
    return { success: `✓ ${validated.name} registered as ${studentIdStr}.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Registration failed. Please check all fields and try again.' }
  }
}

export async function updateStudentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()

    const id = formData.get('id') as string
    const validated = StudentRegistrationSchema.partial().parse({
      name: formData.get('fullName'),
      batch: formData.get('batchType'),
      age: formData.get('age'),
      coachName: formData.get('coachName') || undefined,
      contactDetails: formData.get('contactDetails') || undefined,
    })
    const enrollmentStatus = (formData.get('enrollmentStatus') as string) || 'ACTIVE'

    await prisma.student.update({
      where: { id },
      data: {
        fullName: validated.name,
        batchType: validated.batch,
        age: validated.age,
        coachName: validated.coachName || null,
        contactDetails: validated.contactDetails || null,
        enrollmentStatus,
      },
    })

    revalidatePath('/admin/students')
    revalidatePath('/admin')
    return { success: 'Student profile updated successfully.' }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: `Update failed: ${error?.message || 'Unknown error'}` }
  }
}

export async function broadcastNotificationAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()

    const validated = BroadcastSchema.parse({
      title: formData.get('title') || 'General Announcement',
      message: formData.get('message'),
      category: formData.get('category') || 'GENERAL',
    })

    const broadcast = await prisma.broadcast.create({
      data: {
        title: validated.title,
        message: validated.message,
        category: validated.category,
        author: 'Academy HQ',
      },
    })

    // Instant Real-Time Global Notification Broadcast (<50ms)
    realtimeBus.publish('global', 'broadcast.new', {
      broadcast: {
        id: broadcast.id,
        title: broadcast.title,
        message: broadcast.message,
        category: broadcast.category,
        createdAt: broadcast.createdAt.toISOString(),
      },
    })

    // Asynchronous non-blocking background fanout to individual athlete inboxes (with full text)
    queueMicrotask(async () => {
      try {
        const allUsers = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } })
        await prisma.notification.createMany({
          data: allUsers.map((u) => ({
            userId: u.id,
            type: 'GENERAL',
            message: `${validated.title}: ${validated.message}`,
          })),
        })
      } catch (err) {
        console.error('[BROADCAST_FANOUT_ERROR]', err)
      }
    })

    revalidatePath('/student')
    return { success: `Broadcasted to Academy Global Hub in real-time.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Broadcast Protocol Failed' }
  }
}

export async function createTournamentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    const validated = TournamentSchema.parse({
      name: formData.get('name'),
      venue: formData.get('venue'),
      level: formData.get('level'),
      entryFee: formData.get('entryFee'),
      date: formData.get('date'),
      eligibility: formData.get('eligibility')
    })

    await prisma.tournament.create({
      data: {
        name: validated.name,
        venue: validated.venue,
        level: validated.level,
        entryFee: rupeesToPaise(validated.entryFee),
        eligibilityCriteria: validated.eligibility || null,
        date: validated.date,
      },
    })

    revalidatePath('/admin/tournaments')
    revalidatePath('/student/tournaments')
    return { success: `Tournament "${validated.name}" published.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Failed to create tournament.' }
  }
}

export async function registerForTournamentAction(prevState: any, formData: FormData) {
  try {
    const session = await requireAny()

    const tournamentId = formData.get('tournamentId') as string
    let studentId = formData.get('studentId') as string

    // Security: Only allow student to register for themselves
    if (session.role === 'STUDENT') {
      if (session.studentId !== studentId && session.internalStudentId !== studentId) {
        return { error: 'Access Denied: Cannot register for another athlete.' }
      }
      studentId = session.internalStudentId || studentId
    }

    if (!tournamentId || !studentId) return { error: 'Missing registration parameters.' }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) return { error: 'Tournament not found.' }

    const existing = await prisma.tournamentPayment.findFirst({
      where: { studentId, tournamentId },
    })
    if (existing) return { error: 'Athlete is already registered for this tournament.' }

    await prisma.tournamentPayment.create({
      data: {
        tournamentId,
        studentId,
        amountPaid: tournament.entryFee,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: `UPI_REF_${Math.floor(Math.random() * 1000000)}`,
      },
    })

    revalidatePath('/student/tournaments')
    return { success: 'Tournament registration successful!' }
  } catch (error: any) {
    return { error: error.message || 'Registration failed' }
  }
}
