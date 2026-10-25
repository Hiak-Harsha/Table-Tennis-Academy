import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'
import { verifyWebhookSignature } from '@/lib/payment-security'
import { assertValidPaymentTransition, PaymentState } from '@/lib/payment-state'
import { writeAuditLog } from '@/lib/audit'
import { realtimeBus } from '@/lib/realtime/bus'

export const dynamic = 'force-dynamic'

/**
 * Strict Zod schema for Razorpay Webhook Payloads
 * Eliminates all `any` types and guarantees runtime type safety.
 */
const RazorpayPaymentEntitySchema = z.object({
  id: z.string(),
  order_id: z.string().optional().nullable(),
  amount: z.number(),
  currency: z.string().default('INR'),
  status: z.string(),
  method: z.string().optional().nullable(),
  error_description: z.string().optional().nullable(),
})

const RazorpayWebhookPayloadSchema = z.object({
  event: z.string(),
  id: z.string().optional(),
  event_id: z.string().optional(),
  payload: z
    .object({
      payment: z
        .object({
          entity: RazorpayPaymentEntitySchema,
        })
        .optional(),
      refund: z
        .object({
          entity: z.object({
            id: z.string(),
            payment_id: z.string(),
            amount: z.number(),
            status: z.string(),
          }),
        })
        .optional(),
    })
    .optional(),
  // Direct fallback fields for legacy payloads
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
})

/**
 * Production-ready Webhook Handler for Payment Confirmation.
 * Enforces raw body HMAC-SHA256 signature verification, X-Razorpay-Event-Id idempotency,
 * RECEIVED-first persistence, amount/currency matching, and atomic database state transitions.
 */
export async function POST(req: NextRequest) {
  let eventRecordId: string | null = null

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

    // 2. Parse payload safely with Zod
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
    }

    const parseResult = RazorpayWebhookPayloadSchema.safeParse(parsedJson)
    if (!parseResult.success) {
      console.warn('[WEBHOOK] Schema validation failed:', parseResult.error.format())
      return NextResponse.json({ error: 'Invalid webhook schema', details: parseResult.error.format() }, { status: 400 })
    }

    const payload = parseResult.data

    // 3. Extract authoritative event ID from header or payload
    const eventId =
      req.headers.get('x-razorpay-event-id') ||
      payload.event_id ||
      payload.id

    if (!eventId) {
      console.warn('[WEBHOOK] Missing event identifier')
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    const eventType = payload.event

    // 4. Idempotency Check: if already processed, return 200 immediately
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId },
    })

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      console.info(`[WEBHOOK] Idempotent duplicate event received and ignored: ${eventId}`)
      return NextResponse.json({ received: true, note: 'Duplicate event already processed' }, { status: 200 })
    }

    // 5. Insert event as RECEIVED before fulfillment attempt (retry safety)
    const eventRecord = await prisma.paymentEvent.create({
      data: {
        eventId,
        eventType,
        payload: rawBody,
        status: 'RECEIVED',
      },
    })
    eventRecordId = eventRecord.id

    // 6. Handle Event Dispatching
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity
      const orderId = paymentEntity?.order_id || payload.orderId
      const paymentId = paymentEntity?.id || payload.paymentId || `pay_${Date.now()}`
      const method = (paymentEntity?.method || 'ONLINE').toUpperCase()
      const webhookAmount = paymentEntity?.amount
      const webhookCurrency = paymentEntity?.currency || 'INR'

      if (!orderId) {
        await prisma.paymentEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'IGNORED' },
        })
        return NextResponse.json({ received: true, warning: 'No order_id associated with event' }, { status: 200 })
      }

      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: { student: { include: { user: true } } },
      })

      if (!payment) {
        console.warn(`[WEBHOOK] Order ID ${orderId} not found in database`)
        await prisma.paymentEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'IGNORED' },
        })
        return NextResponse.json({ received: true, warning: 'Order not found' }, { status: 200 })
      }

      if (payment.status === 'CAPTURED') {
        await prisma.paymentEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
        return NextResponse.json({ received: true, note: 'Payment already captured' }, { status: 200 })
      }

      // Authoritative verification: Amount and Currency must match exactly
      if (typeof webhookAmount === 'number' && webhookAmount !== payment.amount) {
        console.error(`[WEBHOOK SECURITY] Amount mismatch for order ${orderId}: expected ${payment.amount}, received ${webhookAmount}`)
        await prisma.paymentEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'FAILED' },
        })
        return NextResponse.json({ error: 'Payment amount mismatch detected' }, { status: 400 })
      }

      if (webhookCurrency && webhookCurrency !== payment.currency) {
        console.error(`[WEBHOOK SECURITY] Currency mismatch for order ${orderId}: expected ${payment.currency}, received ${webhookCurrency}`)
        await prisma.paymentEvent.update({
          where: { id: eventRecord.id },
          data: { status: 'FAILED' },
        })
        return NextResponse.json({ error: 'Payment currency mismatch detected' }, { status: 400 })
      }

      // Assert state transition legality
      assertValidPaymentTransition(payment.status as PaymentState, 'CAPTURED')

      const now = new Date()
      const receiptNo = `REC-${Date.now().toString(36).toUpperCase()}`

      // Execute atomic transaction for fulfillment
      await prisma.$transaction(async (tx) => {
        // Transition Payment to CAPTURED
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            paymentId,
            method,
            capturedAt: now,
          },
        })

        if (payment.purpose === 'FEE') {
          await tx.academyFee.update({
            where: { id: payment.targetId },
            data: {
              status: 'PAID',
              paymentDate: now,
              method,
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

        // Mark event as PROCESSED atomically
        await tx.paymentEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: 'PROCESSED',
            processedAt: now,
          },
        })
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

      // Real-time dispatch to user's live notification feed
      realtimeBus.publish(`user:${payment.student.userId}`, 'notification.new', {
        notification: {
          id: receiptNo,
          type: payment.purpose,
          message:
            payment.purpose === 'FEE'
              ? `Payment of ₹${payment.amount / 100} received successfully. Receipt: ${receiptNo}.`
              : `Tournament entry fee payment confirmed. Registration receipt: ${receiptNo}.`,
          isRead: false,
          createdAt: now.toISOString(),
        },
      })

      // Real-time dispatch to admin live operations dashboard
      realtimeBus.publish('admin:ops', 'payment.captured', {
        orderId,
        paymentId,
        amount: payment.amount,
        studentName: payment.student.fullName,
        purpose: payment.purpose,
        receiptNo,
      })

      return NextResponse.json({ received: true, status: 'CAPTURED', receiptNo }, { status: 200 })
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity
      const orderId = paymentEntity?.order_id || payload.orderId
      const reason = paymentEntity?.error_description || 'Payment failed or declined by issuing bank'

      if (orderId) {
        await prisma.payment.updateMany({
          where: { orderId, status: { not: 'CAPTURED' } },
          data: {
            status: 'FAILED',
            failureReason: reason,
          },
        })
      }

      await prisma.paymentEvent.update({
        where: { id: eventRecord.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })

      return NextResponse.json({ received: true, status: 'FAILED' }, { status: 200 })
    } else if (eventType === 'refund.processed') {
      const refundEntity = payload.payload?.refund?.entity
      const paymentId = refundEntity?.payment_id

      if (paymentId) {
        const payment = await prisma.payment.findUnique({
          where: { paymentId },
        })

        if (payment && payment.status === 'CAPTURED') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED' },
          })
        }
      }

      await prisma.paymentEvent.update({
        where: { id: eventRecord.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })

      return NextResponse.json({ received: true, status: 'REFUNDED' }, { status: 200 })
    }

    // Default: mark unhandled event as IGNORED and return 200
    await prisma.paymentEvent.update({
      where: { id: eventRecord.id },
      data: { status: 'IGNORED' },
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err)
    if (eventRecordId) {
      await prisma.paymentEvent
        .update({
          where: { id: eventRecordId },
          data: { status: 'FAILED' },
        })
        .catch(() => {})
    }
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 })
  }
}
