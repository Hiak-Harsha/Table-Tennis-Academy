'use server'

import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { requireStudent } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import {
  checkTournamentCapacity,
  checkTournamentRegistrationWindow,
  checkStudentTournamentEligibility,
} from '@/lib/tournament-eligibility'

export interface TournamentRegistrationResponse {
  success?: string
  error?: string
  registrationId?: string
}

/**
 * Authoritative, single server action for student tournament registration.
 * Free tournaments register immediately; paid tournaments must be fulfilled through the payment gateway webhook.
 * Enforces future dates, registration deadlines, max player capacity,
 * eligibility criteria (batch & age), duplicate prevention, and DB-authoritative pricing.
 */
export async function registerForTournamentAction(
  tournamentId: string
): Promise<TournamentRegistrationResponse> {
  try {
    const user = await requireStudent()
    const student = await prisma.student.findUnique({
      where: { id: user.student.id },
    })

    if (!student) {
      return { error: 'Student record not found.' }
    }

    if (!tournamentId || typeof tournamentId !== 'string') {
      return { error: 'Invalid tournament ID provided.' }
    }

    // 1. Fetch tournament details and participant count
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    })

    if (!tournament) {
      return { error: 'Tournament not found or no longer active.' }
    }

    // 2. Paid tournaments must complete payment via gateway/webhook (single path)
    if (tournament.entryFee > 0) {
      return {
        error: 'Online payment required for this tournament. Please complete payment at checkout to register.',
      }
    }

    // 3. Validate registration window (date in future, deadline not passed)
    const windowCheck = checkTournamentRegistrationWindow({
      date: tournament.date,
      registrationDeadline: tournament.registrationDeadline,
    })
    if (!windowCheck.eligible) {
      return { error: windowCheck.reason || 'Tournament registration is closed.' }
    }

    // 4. Validate participant capacity
    const capacityCheck = checkTournamentCapacity(
      tournament.maxPlayers,
      tournament._count.participants
    )
    if (!capacityCheck.eligible) {
      return { error: capacityCheck.reason || 'Tournament has reached maximum capacity.' }
    }

    // 5. Validate student eligibility (active enrollment, batch type, age limits)
    const eligibilityCheck = checkStudentTournamentEligibility(
      {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        age: student.age,
        batchType: student.batchType,
        enrollmentStatus: student.enrollmentStatus,
      },
      {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        venue: tournament.venue,
        level: tournament.level,
        entryFee: tournament.entryFee,
        eligibilityCriteria: tournament.eligibilityCriteria,
        maxPlayers: tournament.maxPlayers,
        registrationDeadline: tournament.registrationDeadline,
      }
    )
    if (!eligibilityCheck.eligible) {
      return { error: eligibilityCheck.reason || 'You do not meet the eligibility requirements for this tournament.' }
    }

    // 6. Enforce no duplicates
    const existingRegistration = await prisma.tournamentPayment.findUnique({
      where: {
        studentId_tournamentId: {
          studentId: student.id,
          tournamentId: tournament.id,
        },
      },
    })
    if (existingRegistration) {
      return { error: 'You are already registered for this tournament.' }
    }

    // 7. Record free registration with cryptographically secure confirmation details
    const refCode = crypto.randomBytes(3).toString('hex').toUpperCase()
    const confirmationDetails = `TTA-${Date.now().toString(36).toUpperCase()}-${refCode}`

    const registration = await prisma.tournamentPayment.create({
      data: {
        studentId: student.id,
        tournamentId: tournament.id,
        amountPaid: 0,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails,
      },
    })

    revalidatePath('/student/tournaments')
    revalidatePath('/admin/tournaments')

    return {
      success: 'Tournament registration confirmed successfully.',
      registrationId: registration.id,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Tournament registration failed.'
    return { error: message }
  }
}
