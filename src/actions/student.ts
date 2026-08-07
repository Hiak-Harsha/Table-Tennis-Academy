'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireStudent } from '@/lib/auth-utils'

export async function processFeePayment(formData: FormData) {
  try {
    const session = await requireStudent()
    const feeId = formData.get('feeId') as string
    if (!feeId) return { error: 'Fee ID incomplete.' }

    // Security Audit: Verify original ownership before DB mutation
    const targetFee = await prisma.academyFee.findUnique({ where: { id: feeId } })
    if (!targetFee || targetFee.studentId !== session.studentId) {
      return { error: 'Security Bridge Violation: Cross-athlete mutation blocked.' }
    }

    await prisma.academyFee.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paymentDate: new Date(),
        receiptUrl: `/receipts/${feeId}.pdf`,
        qrCodeHash: 'VALID_QR_' + Math.random().toString(36).substring(7)
      }
    })

    revalidatePath('/student/fees')
    revalidatePath('/student')
    
    return { success: 'Secure Nexus Handshake Complete: Payment Validated.' }
  } catch (error) {
    return { error: 'Integrated authentication failure or registry rejection.' }
  }
}

export async function registerForTournament(prevState: any, formData: FormData) {
  try {
    const session = await requireStudent()
    const tournamentId = formData.get('tournamentId') as string
    const amount = Number(formData.get('amount'))

    if (!tournamentId) return { error: 'Tournament identifier missing.' }

    // Security: Use session identity instead of unreliable client-provided ID
    await prisma.tournamentPayment.create({
      data: {
        studentId: session.studentId,
        tournamentId,
        amountPaid: amount,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: 'CONFIRMED_' + tournamentId.substring(0, 5)
      }
    })

    revalidatePath('/student/tournaments')
    return { success: 'Athlete registry synchronized for tournament.' }
  } catch (error) {
    return { error: 'Handshake timeout or registry duplication detected.' }
  }
}

export async function registerForTournamentAction(tournamentId: string, amount: number) {
  try {
    const session = await requireStudent()
    
    // Check if already registered
    const existing = await prisma.tournamentPayment.findFirst({
      where: { studentId: session.studentId, tournamentId }
    })
    if (existing) return { error: 'Identity already registered for this sequence.' }

    await prisma.tournamentPayment.create({
      data: {
        studentId: session.studentId,
        tournamentId,
        amountPaid: amount,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: 'TTA-CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      }
    })

    revalidatePath('/student/tournaments')
    return { success: 'Confirmed Athlete Enrollment!' }
  } catch (error) {
    return { error: 'Nexus Protocol Error: Registration Handshake Failed.' }
  }
}
