import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'
import { getPaymentProvider } from '@/lib/payments/provider'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Scheduled payment reconciliation and fee aging cron job.
 * 1. Checks provider status for uncaptured orders older than 10 minutes.
 * 2. Ages unpaid AcademyFee records past their dueDate to OVERDUE status.
 */
export async function GET(req: NextRequest) {
  return handleReconciliation(req)
}

export async function POST(req: NextRequest) {
  return handleReconciliation(req)
}

async function handleReconciliation(req: NextRequest) {
  // Enforce CRON_SECRET in production
  if (env.NODE_ENV === 'production' && env.CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 })
    }
  }

  const now = new Date()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  let reconciledPayments = 0
  let failedPayments = 0

  try {
    const stalePayments = await prisma.payment.findMany({
      where: {
        status: { in: ['CREATED', 'AUTHORIZED'] },
        provider: 'RAZORPAY',
        createdAt: {
          lte: tenMinutesAgo,
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        student: { include: { user: true } },
      },
      take: 50,
    })

    const provider = getPaymentProvider()

    for (const payment of stalePayments) {
      try {
        const orderInfo = await provider.fetchOrder(payment.orderId)

        if (orderInfo.status === 'paid' || orderInfo.status === 'captured') {
          const receiptNo = `REC-RECON-${Date.now().toString(36).toUpperCase()}`

          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'CAPTURED',
                capturedAt: now,
              },
            })

            if (payment.purpose === 'FEE') {
              await tx.academyFee.update({
                where: { id: payment.targetId },
                data: {
                  status: 'PAID',
                  paymentDate: now,
                  receiptUrl: `/receipts/${receiptNo}.pdf`,
                  qrCodeHash: `VERIFIED_${receiptNo}`,
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
            }
          })

          await writeAuditLog({
            actorId: 'SYSTEM_CRON',
            actorRole: 'ADMIN',
            action: 'PAYMENT_RECONCILED_CAPTURED',
            entity: 'Payment',
            entityId: payment.id,
            details: {
              orderId: payment.orderId,
              amount: payment.amount,
              receiptNo,
            },
          })

          reconciledPayments++
        } else {
          // If order is older than 60 mins and still unpaid, mark FAILED
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
          if (payment.createdAt <= oneHourAgo) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'FAILED',
                failureReason: 'Order session timed out after 60 minutes without capture',
              },
            })
            failedPayments++
          }
        }
      } catch (err) {
        console.warn(`[RECONCILIATION] Failed to check status for order ${payment.orderId}:`, err)
      }
    }

    // Age overdue fees
    const overdueResult = await prisma.academyFee.updateMany({
      where: {
        status: 'DUE',
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    })

    return NextResponse.json({
      success: true,
      reconciledPayments,
      failedPayments,
      overdueFeesUpdated: overdueResult.count,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Reconciliation failed'
    console.error('[CRON ERROR]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
