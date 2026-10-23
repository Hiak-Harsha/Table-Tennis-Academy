'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-guard'
import { hashPassword } from '@/lib/password'
import { rupeesToPaise } from '@/lib/currency'
import {
  StudentRegistrationSchema,
  TournamentSchema,
  BroadcastSchema,
} from '@/lib/validations'
import { realtimeBus } from '@/lib/realtime/bus'
import { generateStudentId } from '@/lib/student-id'
import { isValidStudentStatusTransition, StudentEnrollmentStatusEnum } from '@/lib/student-state'
import { normalizePhone } from '@/lib/phone'
import { isFutureDate } from '@/lib/date'
import { z } from 'zod'

export async function createStudentAction(prevState: unknown, formData: FormData) {
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

    // Monotonically generated collision-free student ID
    const studentIdStr = await generateStudentId()

    const existing = await prisma.user.findUnique({ where: { phone: validated.phone } })
    if (existing) return { error: `Phone number ${validated.phone} is already registered.` }

    const hashedPassword = await hashPassword(validated.password)

    await prisma.$transaction(async (tx) => {
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
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    const message = error instanceof Error ? error.message : 'Registration failed.'
    return { error: message }
  }
}

export async function updateStudentAction(prevState: unknown, formData: FormData) {
  try {
    await requireAdmin()

    const id = formData.get('id') as string
    if (!id) return { error: 'Student ID is required.' }

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!student) return { error: 'Student record not found.' }

    const validated = StudentRegistrationSchema.partial().parse({
      name: formData.get('fullName'),
      batch: formData.get('batchType'),
      age: formData.get('age'),
      coachName: formData.get('coachName') || undefined,
      contactDetails: formData.get('contactDetails') || undefined,
    })

    // Status transition validation via authoritative state machine
    const rawTargetStatus = formData.get('enrollmentStatus') as string
    let targetStatus = student.enrollmentStatus
    if (rawTargetStatus && rawTargetStatus !== student.enrollmentStatus) {
      const statusValidation = StudentEnrollmentStatusEnum.safeParse(rawTargetStatus)
      if (!statusValidation.success) {
        return { error: `Invalid enrollment status: ${rawTargetStatus}` }
      }
      const transitionCheck = isValidStudentStatusTransition(student.enrollmentStatus, rawTargetStatus)
      if (!transitionCheck.valid) {
        return { error: transitionCheck.reason || 'Illegal status transition.' }
      }
      targetStatus = rawTargetStatus
    }

    // Optional phone change validation
    const rawPhone = formData.get('phone') as string
    let normalizedPhone: string | null = null
    if (rawPhone && rawPhone.trim()) {
      try {
        normalizedPhone = normalizePhone(rawPhone)
        if (normalizedPhone !== student.user.phone) {
          const phoneConflict = await prisma.user.findUnique({ where: { phone: normalizedPhone } })
          if (phoneConflict) {
            return { error: `Phone number ${normalizedPhone} is already in use by another account.` }
          }
        }
      } catch (phoneErr: unknown) {
        return { error: phoneErr instanceof Error ? phoneErr.message : 'Invalid phone number format.' }
      }
    }

    // Optional admin password reset
    const newPassword = formData.get('newPassword') as string
    let newPasswordHash: string | null = null
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
      }
      newPasswordHash = await hashPassword(newPassword)
    }

    await prisma.$transaction(async (tx) => {
      // Update student profile
      await tx.student.update({
        where: { id },
        data: {
          fullName: validated.name,
          batchType: validated.batch,
          age: validated.age,
          coachName: validated.coachName || null,
          contactDetails: validated.contactDetails || null,
          enrollmentStatus: targetStatus,
        },
      })

      // Update user credentials if phone or password changed
      if (normalizedPhone || newPasswordHash) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
            ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
          },
        })
      }
    })

    revalidatePath('/admin/students')
    revalidatePath('/admin')
    return { success: 'Student profile updated successfully.' }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    const message = error instanceof Error ? error.message : 'Update failed.'
    return { error: `Update failed: ${message}` }
  }
}

export async function broadcastNotificationAction(prevState: unknown, formData: FormData) {
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

    // Asynchronous non-blocking background fanout to individual athlete inboxes (preserving full message without truncation)
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
    return { success: `Published to Academy Notice Board in real-time.` }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    const message = error instanceof Error ? error.message : 'Failed to publish announcement'
    return { error: message }
  }
}

export async function createTournamentAction(prevState: unknown, formData: FormData) {
  try {
    await requireAdmin()

    const validated = TournamentSchema.parse({
      name: formData.get('name'),
      venue: formData.get('venue'),
      level: formData.get('level'),
      entryFee: formData.get('entryFee'),
      date: formData.get('date'),
      eligibility: formData.get('eligibility'),
      maxPlayers: formData.get('maxPlayers'),
      registrationDeadline: formData.get('registrationDeadline'),
    })

    // Tournament date must be in future
    if (!isFutureDate(validated.date)) {
      return { error: 'Tournament date must be scheduled in the future.' }
    }

    if (validated.registrationDeadline && !isFutureDate(validated.registrationDeadline)) {
      return { error: 'Registration deadline must be in the future.' }
    }

    await prisma.tournament.create({
      data: {
        name: validated.name,
        venue: validated.venue,
        level: validated.level,
        entryFee: rupeesToPaise(validated.entryFee),
        eligibilityCriteria: validated.eligibility || null,
        date: validated.date,
        maxPlayers: validated.maxPlayers || null,
        registrationDeadline: validated.registrationDeadline || null,
      },
    })

    revalidatePath('/admin/tournaments')
    revalidatePath('/student/tournaments')
    return { success: `Tournament "${validated.name}" published successfully.` }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    const message = error instanceof Error ? error.message : 'Failed to create tournament.'
    return { error: message }
  }
}
