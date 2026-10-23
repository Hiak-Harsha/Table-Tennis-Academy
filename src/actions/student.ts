'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireStudent } from '@/lib/auth-guard'

export async function processFeePayment(formData: FormData) {
  try {
    const user = await requireStudent()
    const feeId = formData.get('feeId') as string
    if (!feeId) return { error: 'Fee ID is required.' }

    // Security Audit: Verify original ownership before DB mutation
    const targetFee = await prisma.academyFee.findUnique({ where: { id: feeId } })
    if (!targetFee || targetFee.studentId !== user.student.id) {
      return { error: 'Unauthorized: Cross-athlete mutation blocked.' }
    }

    await prisma.academyFee.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paymentDate: new Date(),
        receiptUrl: `/receipts/${feeId}.pdf`,
        qrCodeHash: 'VALID_QR_' + Math.random().toString(36).substring(7),
      },
    })

    revalidatePath('/student/fees')
    revalidatePath('/student')

    return { success: 'Payment validated successfully.' }
  } catch (error: any) {
    return { error: error.message || 'Payment processing failed.' }
  }
}

export async function registerForTournament(prevState: any, formData: FormData) {
  try {
    const user = await requireStudent()
    const tournamentId = formData.get('tournamentId') as string
    const amount = Number(formData.get('amount'))

    if (!tournamentId) return { error: 'Tournament identifier missing.' }

    // Check if already registered
    const existing = await prisma.tournamentPayment.findFirst({
      where: { studentId: user.student.id, tournamentId },
    })
    if (existing) return { error: 'Athlete is already registered for this tournament.' }

    // Security: Use authenticated session student ID
    await prisma.tournamentPayment.create({
      data: {
        studentId: user.student.id,
        tournamentId,
        amountPaid: amount,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: 'CONFIRMED_' + tournamentId.substring(0, 5),
      },
    })

    revalidatePath('/student/tournaments')
    return { success: 'Registered for tournament successfully.' }
  } catch (error: any) {
    return { error: error.message || 'Tournament registration failed.' }
  }
}

export async function registerForTournamentAction(tournamentId: string, amount: number) {
  try {
    const user = await requireStudent()

    // Check if already registered
    const existing = await prisma.tournamentPayment.findFirst({
      where: { studentId: user.student.id, tournamentId },
    })
    if (existing) return { error: 'Athlete is already registered for this tournament.' }

    await prisma.tournamentPayment.create({
      data: {
        studentId: user.student.id,
        tournamentId,
        amountPaid: amount,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: 'TTA-CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
    })

    revalidatePath('/student/tournaments')
    return { success: 'Confirmed Athlete Enrollment!' }
  } catch (error: any) {
    return { error: error.message || 'Tournament registration failed.' }
  }
}
