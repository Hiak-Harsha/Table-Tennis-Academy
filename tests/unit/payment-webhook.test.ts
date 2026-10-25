import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/payments/route'
import { generateWebhookSignature } from '@/lib/payment-security'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    paymentEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    academyFee: {
      update: vi.fn(),
    },
    tournamentPayment: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { default: mockPrisma }
})

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}))

vi.mock('@/lib/realtime/bus', () => ({
  realtimeBus: {
    publish: vi.fn(),
  },
}))

describe('Payment Webhook Handler (/api/webhooks/payments)', () => {
  const secret = 'dev_razorpay_webhook_secret_key_32_bytes_long'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects requests with missing signature with status 400', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.captured' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing signature/i)
  })

  it('rejects requests with invalid signature with status 400', async () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'invalid_signature_hex_code',
      },
      body,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid signature/i)
  })

  it('handles duplicate events idempotently via X-Razorpay-Event-Id header', async () => {
    const eventId = 'evt_test_unique_header_id_123'
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: 'order_123',
            amount: 250000,
            currency: 'INR',
            status: 'captured',
            method: 'UPI',
          },
        },
      },
    }
    const rawBody = JSON.stringify(payload)
    const signature = generateWebhookSignature(rawBody, secret)

    vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValueOnce({
      id: 'existing-event-id',
      eventId,
      eventType: 'payment.captured',
      payload: rawBody,
      receivedAt: new Date(),
      processedAt: new Date(),
      status: 'PROCESSED',
    } as any)

    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: rawBody,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.note).toMatch(/duplicate/i)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects capture if webhook amount does not match authoritative payment record', async () => {
    const eventId = 'evt_test_amount_mismatch_456'
    const payload = {
      event: 'payment.captured',
      id: eventId,
      payload: {
        payment: {
          entity: {
            id: 'pay_tampered',
            order_id: 'order_fee_789',
            amount: 10000, // 100 INR instead of 2500 INR (250000 paise)
            currency: 'INR',
            status: 'captured',
            method: 'UPI',
          },
        },
      },
    }
    const rawBody = JSON.stringify(payload)
    const signature = generateWebhookSignature(rawBody, secret)

    vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({
      id: 'event-created-id',
      eventId,
      eventType: 'payment.captured',
      payload: rawBody,
      receivedAt: new Date(),
      processedAt: null,
      status: 'RECEIVED',
    } as any)

    vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
      id: 'payment-db-id',
      orderId: 'order_fee_789',
      studentId: 'student-1',
      purpose: 'FEE',
      targetId: 'fee-1',
      amount: 250000, // DB expects 2500 INR
      currency: 'INR',
      status: 'CREATED',
      student: { userId: 'user-1', fullName: 'Athlete Test' },
    } as any)

    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
      },
      body: rawBody,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/amount.*mismatch/i)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('records event as RECEIVED first and successfully captures fee payment in transaction', async () => {
    const eventId = 'evt_test_valid_fulfillment_789'
    const payload = {
      event: 'payment.captured',
      id: eventId,
      payload: {
        payment: {
          entity: {
            id: 'pay_valid_123',
            order_id: 'order_valid_123',
            amount: 250000,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    }
    const rawBody = JSON.stringify(payload)
    const signature = generateWebhookSignature(rawBody, secret)

    vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({
      id: 'event-created-id',
      eventId,
      eventType: 'payment.captured',
      payload: rawBody,
      receivedAt: new Date(),
      processedAt: null,
      status: 'RECEIVED',
    } as any)

    vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
      id: 'payment-db-id',
      orderId: 'order_valid_123',
      studentId: 'student-1',
      purpose: 'FEE',
      targetId: 'fee-1',
      amount: 250000,
      currency: 'INR',
      status: 'CREATED',
      student: { userId: 'user-1', fullName: 'Athlete Test' },
    } as any)

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const mockTx = {
        payment: { update: vi.fn() },
        academyFee: { update: vi.fn() },
        tournamentPayment: { upsert: vi.fn() },
        notification: { create: vi.fn() },
        paymentEvent: { update: vi.fn() },
      }
      return await callback(mockTx)
    })

    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
      },
      body: rawBody,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('CAPTURED')
    expect(json.receiptNo).toMatch(/^REC-[A-Z0-9]+$/)

    // Verify event was created as RECEIVED
    expect(prisma.paymentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId,
          status: 'RECEIVED',
        }),
      })
    )
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('handles payment.failed event and updates payment record with failure reason', async () => {
    const eventId = 'evt_test_failed_payment_001'
    const payload = {
      event: 'payment.failed',
      id: eventId,
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_123',
            order_id: 'order_failed_123',
            amount: 250000,
            currency: 'INR',
            status: 'failed',
            error_description: 'Payment was declined by issuing bank',
          },
        },
      },
    }
    const rawBody = JSON.stringify(payload)
    const signature = generateWebhookSignature(rawBody, secret)

    vi.mocked(prisma.paymentEvent.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({
      id: 'event-failed-id',
      eventId,
      eventType: 'payment.failed',
      payload: rawBody,
      status: 'RECEIVED',
    } as any)

    const req = new NextRequest('http://localhost/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
      },
      body: rawBody,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('FAILED')

    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orderId: 'order_failed_123' }),
        data: expect.objectContaining({
          status: 'FAILED',
          failureReason: 'Payment was declined by issuing bank',
        }),
      })
    )
  })
})
