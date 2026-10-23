import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'
import { verifyWebhookSignature } from '@/lib/payment-security'
import { assertValidPaymentTransition, PaymentState } from '@/lib/payment-state'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Production-ready Webhook Handler for Payment Confirmation.
 * Enforces raw body HMAC-SHA256 signature verification, idempotency tracking,
 * and atomic state transitions inside database transactions.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('x-webhook-signature')

    if (!signature) {
      console.warn('[WEBHOOK] Missing signature header')
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 })
    }

    // 1. Authoritative HMAC-SHA256 verification (constant-time)
    const isValid = verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)
    if (!isValid) {
      console.warn('[WEBHOOK] Invalid HMAC signature detected')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 2. Parse payload safely
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
    }

    const eventId = payload.event_id || payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const eventType = payload.event || payload.eventType || 'unknown'

    // 3. Idempotency Check: prevent duplicate event processing
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId },
    })

    if (existingEvent) {
      console.info(`[WEBHOOK] Idempotent duplicate event received and ignored: ${eventId}`)
      return NextResponse.json({ received: true, note: 'Duplicate event already processed' }, { status: 200 })
    }

    // 4. Record raw webhook event
    await prisma.paymentEvent.create({
      data: {
        eventId,
        eventType,
        payload: rawBody,
        status: 'PROCESSED',
      },
    })

    // 5. Handle Event Dispatching
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentData = payload.payload?.payment?.entity || payload
      const orderId = paymentData.order_id || payload.orderId
      const paymentId = paymentData.id || payload.paymentId || `pay_${Date.now()}`
      const method = paymentData.method || 'ONLINE'

      if (!orderId) {
        return NextResponse.json({ received: true, warning: 'No order_id associated with event' }, { status: 200 })
      }

      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: { student: { include: { user: true } } },
      })

      if (!payment) {
        console.warn(`[WEBHOOK] Order ID ${orderId} not found in database`)
        return NextResponse.json({ received: true, warning: 'Order not found' }, { status: 200 })
      }

      if (payment.status === 'CAPTURED') {
        return NextResponse.json({ received: true, note: 'Payment already captured' }, { status: 200 })
      }

      // Assert state transition legality
      assertValidPaymentTransition(payment.status as PaymentState, 'CAPTURED')

      const now = new Date()
      const receiptNo = `REC-${Date.now().toString(36).toUpperCase()}`

      // Execute atomic transaction for fulfillment
      await prisma.$transaction(async (tx: any) => {
        // Transition Payment to CAPTURED
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            paymentId,
            method: method.toUpperCase(),
            capturedAt: now,
          },
        })

        if (payment.purpose === 'FEE') {
          await tx.academyFee.update({
            where: { id: payment.targetId },
            data: {
              status: 'PAID',
              paymentDate: now,
              method: method.toUpperCase(),
              receiptUrl: `/receipts/${receiptNo}.pdf`,
              qrCodeHash: `VERIFIED_${receiptNo}`,
            },
          })

          await tx.notification.create({
            data: {
              userId: payment.student.userId,
              type: 'FEE',
              message: `Payment of ₹${payment.amount / 100} received successfully. Receipt: ${receiptNo}.`,
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
              message: `Tournament entry fee payment confirmed. Registration receipt: ${receiptNo}.`,
            },
          })
        }
      })

      await writeAuditLog({
        actorId: payment.student.userId,
        actorRole: 'STUDENT',
        action: 'PAYMENT_WEBHOOK_CAPTURED',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          orderId,
          paymentId,
          purpose: payment.purpose,
          targetId: payment.targetId,
          amountPaise: payment.amount,
          receiptNo,
        },
      })

      return NextResponse.json({ received: true, status: 'CAPTURED', receiptNo }, { status: 200 })
    } else if (eventType === 'payment.failed') {
      const paymentData = payload.payload?.payment?.entity || payload
      const orderId = paymentData.order_id || payload.orderId
      const reason = paymentData.error_description || 'Payment failed or declined by issuing bank'

      if (orderId) {
        await prisma.payment.updateMany({
          where: { orderId, status: { not: 'CAPTURED' } },
          data: {
            status: 'FAILED',
            failureReason: reason,
          },
        })
      }

      return NextResponse.json({ received: true, status: 'FAILED' }, { status: 200 })
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 })
  }
}
