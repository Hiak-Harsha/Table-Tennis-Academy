'use server'

import prisma from '@/lib/prisma'
import { requireStudent, requireAdmin } from '@/lib/auth-guard'
import { env } from '@/lib/env'
import { generateUpiIntentUrl } from '@/lib/payment-security'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { getPaymentProvider } from '@/lib/payments/provider'
import { assertValidPaymentTransition, PaymentState } from '@/lib/payment-state'
import {
  checkTournamentRegistrationWindow,
  checkTournamentCapacity,
  checkStudentTournamentEligibility,
} from '@/lib/tournament-eligibility'

export interface CreateOrderParams {
  purpose: 'FEE' | 'TOURNAMENT'
  targetId: string
}

export interface CreateOrderResult {
  success: boolean
  error?: string
  orderId?: string
  keyId?: string
  amount?: number
  currency?: string
  purpose?: string
  targetId?: string
  upiIntent?: string
  title?: string
}

/**
 * Creates an authoritative payment order on the server.
 * Integrates with Razorpay Orders API, prevents duplicate open orders,
 * and enforces strict eligibility and deadline guardrails.
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

      // Check for any existing captured payment for this fee
      const capturedPayment = await prisma.payment.findFirst({
        where: {
          purpose: 'FEE',
          targetId: fee.id,
          status: 'CAPTURED',
        },
      })

      if (capturedPayment) {
        return { success: false, error: 'This fee invoice has already been paid and captured.' }
      }

      // Check if an existing open CREATED order exists within TTL (15 minutes)
      const existingOpenOrder = await prisma.payment.findFirst({
        where: {
          purpose: 'FEE',
          targetId: fee.id,
          status: 'CREATED',
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      })

      amountPaise = fee.amount
      title = `Academy Fee (${fee.interval})`

      if (existingOpenOrder) {
        const upiIntent = generateUpiIntentUrl({
          vpa: env.UPI_VPA,
          name: env.UPI_MERCHANT_NAME,
          amountPaise,
          orderId: existingOpenOrder.orderId,
          note: title,
        })

        return {
          success: true,
          orderId: existingOpenOrder.orderId,
          keyId: env.RAZORPAY_KEY_ID,
          amount: amountPaise,
          currency: 'INR',
          purpose: params.purpose,
          targetId: params.targetId,
          upiIntent,
          title,
        }
      }
    } else if (params.purpose === 'TOURNAMENT') {
      const tournament = await prisma.tournament.findUnique({
        where: { id: params.targetId },
      })

      if (!tournament) {
        return { success: false, error: 'Tournament not found.' }
      }

      // 1. Check if already registered and paid
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

      // 2. Check tournament registration window (future date & deadline)
      const windowCheck = checkTournamentRegistrationWindow({
        date: tournament.date,
        registrationDeadline: tournament.registrationDeadline,
      })
      if (!windowCheck.eligible) {
        return { success: false, error: windowCheck.reason }
      }

      // 3. Check tournament player capacity
      const currentParticipantCount = await prisma.tournamentPayment.count({
        where: {
          tournamentId: tournament.id,
          paymentStatus: 'PAID',
        },
      })
      const capacityCheck = checkTournamentCapacity(tournament.maxPlayers, currentParticipantCount)
      if (!capacityCheck.eligible) {
        return { success: false, error: capacityCheck.reason }
      }

      // 4. Check athlete eligibility profile
      const studentProfile = await prisma.student.findUnique({
        where: { id: student.id },
      })
      if (studentProfile) {
        const eligibilityCheck = checkStudentTournamentEligibility(
          {
            id: studentProfile.id,
            studentId: studentProfile.studentId,
            fullName: studentProfile.fullName,
            age: studentProfile.age,
            batchType: studentProfile.batchType,
            enrollmentStatus: studentProfile.enrollmentStatus,
          },
          tournament
        )
        if (!eligibilityCheck.eligible) {
          return { success: false, error: eligibilityCheck.reason }
        }
      }

      // Check if an existing open CREATED order exists within TTL (15 minutes)
      const existingOpenOrder = await prisma.payment.findFirst({
        where: {
          studentId: student.id,
          purpose: 'TOURNAMENT',
          targetId: tournament.id,
          status: 'CREATED',
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      })

      amountPaise = tournament.entryFee
      title = `Tournament: ${tournament.name}`

      if (existingOpenOrder) {
        const upiIntent = generateUpiIntentUrl({
          vpa: env.UPI_VPA,
          name: env.UPI_MERCHANT_NAME,
          amountPaise,
          orderId: existingOpenOrder.orderId,
          note: title,
        })

        return {
          success: true,
          orderId: existingOpenOrder.orderId,
          keyId: env.RAZORPAY_KEY_ID,
          amount: amountPaise,
          currency: 'INR',
          purpose: params.purpose,
          targetId: params.targetId,
          upiIntent,
          title,
        }
      }
    } else {
      return { success: false, error: 'Invalid payment purpose.' }
    }

    // Call payment provider to create an authoritative gateway order
    const provider = getPaymentProvider()
    const gatewayOrder = await provider.createOrder({
      amountPaise,
      currency: 'INR',
      receipt: `RCP_${Date.now().toString(36).toUpperCase()}`,
      notes: {
        studentId: student.id,
        purpose: params.purpose,
        targetId: params.targetId,
      },
    })

    const orderId = gatewayOrder.orderId

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
      keyId: env.RAZORPAY_KEY_ID,
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
          orderId: `cash_${Date.now().toString(36)}`,
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

/**
 * Administrator action to process a refund for a captured payment.
 */
export async function refundPaymentAction(params: {
  paymentId: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin()

    const payment = await prisma.payment.findUnique({
      where: { id: params.paymentId },
      include: { student: { include: { user: true } } },
    })

    if (!payment) {
      return { success: false, error: 'Payment record not found.' }
    }

    assertValidPaymentTransition(payment.status as PaymentState, 'REFUNDED')

    // Call payment provider if online payment
    if (payment.provider === 'RAZORPAY' && payment.paymentId) {
      const provider = getPaymentProvider()
      await provider.refundPayment(payment.paymentId, payment.amount)
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
        },
      })

      if (payment.purpose === 'FEE') {
        await tx.academyFee.update({
          where: { id: payment.targetId },
          data: {
            status: 'DUE',
            paymentDate: null,
            receiptUrl: null,
            qrCodeHash: null,
          },
        })
      } else if (payment.purpose === 'TOURNAMENT') {
        await tx.tournamentPayment.updateMany({
          where: {
            studentId: payment.studentId,
            tournamentId: payment.targetId,
          },
          data: {
            paymentStatus: 'REFUNDED',
          },
        })
      }

      await tx.notification.create({
        data: {
          userId: payment.student.userId,
          type: payment.purpose,
          message: `Your payment of ₹${payment.amount / 100} has been refunded. Reason: ${params.reason || 'Requested by administration'}.`,
        },
      })
    })

    await writeAuditLog({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'PAYMENT_REFUNDED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        paymentId: payment.id,
        amount: payment.amount,
        reason: params.reason,
      },
    })

    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')
    revalidatePath('/admin/tournaments')

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to process refund.'
    return { success: false, error: msg }
  }
}
