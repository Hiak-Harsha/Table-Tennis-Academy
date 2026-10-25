import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-guard'
import { assertValidPaymentTransition } from '@/lib/payment-state'
import { writeAuditLog } from '@/lib/audit'
import { realtimeBus } from '@/lib/realtime/bus'

export const dynamic = 'force-dynamic'

/**
 * Server-only Development Payment Simulator Route.
 * Strictly disabled in production. Returns 404 unless in development
 * and invoked by an authenticated administrator.
 */
export async function POST(req: NextRequest) {
  // Gate: only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Gate: only authenticated ADMIN can simulate
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required for simulation' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { student: { include: { user: true } } },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (payment.status === 'CAPTURED') {
      return NextResponse.json({ message: 'Payment already captured' }, { status: 200 })
    }

    assertValidPaymentTransition(payment.status as any, 'CAPTURED')

    const now = new Date()
    const receiptNo = `REC-SIM-${Date.now().toString(36).toUpperCase()}`
    const paymentId = `pay_sim_${Date.now()}`

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          paymentId,
          method: 'DEV_SIMULATION',
          capturedAt: now,
        },
      })

      if (payment.purpose === 'FEE') {
        await tx.academyFee.update({
          where: { id: payment.targetId },
          data: {
            status: 'PAID',
            paymentDate: now,
            method: 'DEV_SIMULATION',
            receiptUrl: `/receipts/${receiptNo}.pdf`,
            qrCodeHash: `VERIFIED_${receiptNo}`,
          },
        })

        await tx.notification.create({
          data: {
            userId: payment.student.userId,
            type: 'FEE',
            message: `Payment of ₹${payment.amount / 100} received (Simulated). Receipt: ${receiptNo}.`,
          },
        })
      } else if (payment.purpose === 'TOURNAMENT') {
        await tx.tournamentPayment.upsert({
          where: {
            studentId_tournamentId: {
              studentId: payment.studentId,
              tournamentId: payment.targetId,
            },
          },
          create: {
            studentId: payment.studentId,
            tournamentId: payment.targetId,
            amountPaid: payment.amount,
            paymentStatus: 'PAID',
            paymentDate: now,
            confirmationDetails: receiptNo,
          },
          update: {
            amountPaid: payment.amount,
            paymentStatus: 'PAID',
            paymentDate: now,
            confirmationDetails: receiptNo,
          },
        })

        await tx.notification.create({
          data: {
            userId: payment.student.userId,
            type: 'TOURNAMENT',
            message: `Tournament entry payment confirmed (Simulated). Receipt: ${receiptNo}.`,
          },
        })
      }
    })

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: 'PAYMENT_SIMULATED_CAPTURED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        orderId,
        paymentId,
        receiptNo,
        amount: payment.amount,
      },
    })

    realtimeBus.publish(`user:${payment.student.userId}`, 'notification.new', {
      notification: {
        id: receiptNo,
        type: payment.purpose,
        message: `Payment of ₹${payment.amount / 100} received (Simulated). Receipt: ${receiptNo}.`,
        isRead: false,
        createdAt: now.toISOString(),
      },
    })

    return NextResponse.json({ success: true, receiptNo, status: 'CAPTURED' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Simulation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
