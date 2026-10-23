'use server'

import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { requireStudent, requireAdmin } from '@/lib/auth-guard'
import { env } from '@/lib/env'
import { generateUpiIntentUrl } from '@/lib/payment-security'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export interface CreateOrderParams {
  purpose: 'FEE' | 'TOURNAMENT'
  targetId: string
}

export interface CreateOrderResult {
  success: boolean
  error?: string
  orderId?: string
  amount?: number
  currency?: string
  purpose?: string
  targetId?: string
  upiIntent?: string
  title?: string
}

/**
 * Creates an authoritative payment order on the server.
 * Never trusts client-reported amounts or eligibility;
 * pulls pricing directly from the database in integer paise.
 */
export async function createPaymentOrderAction(params: CreateOrderParams): Promise<CreateOrderResult> {
  try {
    const student = await requireStudent()
    let amountPaise = 0
    let title = ''

    if (params.purpose === 'FEE') {
      const fee = await prisma.academyFee.findUnique({
        where: { id: params.targetId },
      })

      if (!fee) {
        return { success: false, error: 'Fee invoice not found.' }
      }

      if (fee.studentId !== student.id) {
        return { success: false, error: 'Access denied: invoice does not belong to your account.' }
      }

      if (fee.status === 'PAID') {
        return { success: false, error: 'This fee invoice has already been paid.' }
      }

      amountPaise = fee.amount
      title = `Academy Fee (${fee.interval})`
    } else if (params.purpose === 'TOURNAMENT') {
      const tournament = await prisma.tournament.findUnique({
        where: { id: params.targetId },
      })

      if (!tournament) {
        return { success: false, error: 'Tournament not found.' }
      }

      // Check if already registered
      const existingRegistration = await prisma.tournamentPayment.findUnique({
        where: {
          studentId_tournamentId: {
            studentId: student.id,
            tournamentId: tournament.id,
          },
        },
      })

      if (existingRegistration && existingRegistration.paymentStatus === 'PAID') {
        return { success: false, error: 'You are already registered and confirmed for this tournament.' }
      }

      amountPaise = tournament.entryFee
      title = `Tournament: ${tournament.name}`
    } else {
      return { success: false, error: 'Invalid payment purpose.' }
    }

    // Generate unique gateway order ID
    const orderId = `order_${crypto.randomBytes(12).toString('hex')}`

    // Persist Payment record in CREATED state
    await prisma.payment.create({
      data: {
        studentId: student.id,
        purpose: params.purpose,
        targetId: params.targetId,
        amount: amountPaise,
        currency: 'INR',
        provider: 'RAZORPAY',
        orderId,
        status: 'CREATED',
      },
    })

    // Generate UPI Intent deep link for mobile apps
    const upiIntent = generateUpiIntentUrl({
      vpa: env.UPI_VPA,
      name: env.UPI_MERCHANT_NAME,
      amountPaise,
      orderId,
      note: title,
    })

    return {
      success: true,
      orderId,
      amount: amountPaise,
      currency: 'INR',
      purpose: params.purpose,
      targetId: params.targetId,
      upiIntent,
      title,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create payment order.'
    return { success: false, error: msg }
  }
}

/**
 * Polling endpoint for clients to verify payment status without trusting client assertions.
 */
export async function checkPaymentStatusAction(orderId: string): Promise<{
  success: boolean
  status?: string
  capturedAt?: Date | null
  error?: string
}> {
  try {
    const student = await requireStudent()

    const payment = await prisma.payment.findUnique({
      where: { orderId },
    })

    if (!payment) {
      return { success: false, error: 'Order not found.' }
    }

    if (payment.studentId !== student.id) {
      return { success: false, error: 'Access denied.' }
    }

    return {
      success: true,
      status: payment.status,
      capturedAt: payment.capturedAt,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to check status.'
    return { success: false, error: msg }
  }
}

/**
 * Administrator action to record cash/offline payments.
 * Audited and executes atomically in a database transaction.
 */
export async function recordCashPaymentAction(params: {
  studentId: string
  feeId: string
  receiptNote?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin()
    const now = new Date()

    const fee = await prisma.academyFee.findUnique({
      where: { id: params.feeId },
      include: { student: { include: { user: true } } },
    })

    if (!fee) {
      return { success: false, error: 'Fee record not found.' }
    }

    if (fee.status === 'PAID') {
      return { success: false, error: 'Fee has already been paid.' }
    }

    const receiptNo = `REC-CASH-${Date.now().toString(36).toUpperCase()}`

    await prisma.$transaction([
      prisma.academyFee.update({
        where: { id: fee.id },
        data: {
          status: 'PAID',
          paymentDate: now,
          method: 'CASH',
          receiptUrl: `/receipts/${receiptNo}.pdf`,
          qrCodeHash: `VERIFIED_${receiptNo}`,
        },
      }),
      prisma.payment.create({
        data: {
          studentId: fee.studentId,
          purpose: 'FEE',
          targetId: fee.id,
          amount: fee.amount,
          currency: 'INR',
          provider: 'OFFLINE_CASH',
          orderId: `cash_${crypto.randomBytes(8).toString('hex')}`,
          paymentId: receiptNo,
          status: 'CAPTURED',
          method: 'CASH',
          capturedAt: now,
        },
      }),
      prisma.notification.create({
        data: {
          userId: fee.student.userId,
          type: 'FEE',
          message: `Cash payment of ₹${fee.amount / 100} for your ${fee.interval} fee was recorded by administration. Receipt: ${receiptNo}.`,
        },
      }),
    ])

    await writeAuditLog({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'FEE_PAYMENT_CASH_RECORDED',
      entity: 'AcademyFee',
      entityId: fee.id,
      details: {
        studentId: fee.studentId,
        amount: fee.amount,
        receiptNo,
        receiptNote: params.receiptNote,
      },
    })

    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to record cash payment.'
    return { success: false, error: msg }
  }
}
