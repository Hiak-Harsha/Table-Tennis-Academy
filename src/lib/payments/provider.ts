import crypto from 'crypto'
import { env } from '@/lib/env'

export interface CreateOrderInput {
  amountPaise: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}

export interface OrderResult {
  orderId: string
  amount: number
  currency: string
  status?: string
}

export interface PaymentDetails {
  paymentId: string
  orderId: string
  amount: number
  currency: string
  status: 'captured' | 'failed' | 'authorized' | 'refunded'
  method: string
}

export interface RefundResult {
  refundId: string
  amount: number
  status: string
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<OrderResult>
  fetchPayment(paymentId: string): Promise<PaymentDetails>
  fetchOrder(orderId: string): Promise<OrderResult>
  refundPayment(paymentId: string, amountPaise?: number): Promise<RefundResult>
}

/**
 * Production Razorpay Provider calling official REST API.
 */
export class RazorpayProvider implements PaymentProvider {
  private keyId: string
  private keySecret: string
  private baseUrl = 'https://api.razorpay.com/v1'

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || env.RAZORPAY_KEY_ID || ''
    this.keySecret = keySecret || env.RAZORPAY_KEY_SECRET || ''

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are required.')
    }
  }

  private getAuthHeader(): string {
    const creds = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    return `Basic ${creds}`
  }

  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency || 'INR',
        receipt: input.receipt,
        notes: input.notes,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Razorpay order creation failed: ${err.error?.description || res.statusText}`)
    }

    const data = await res.json()
    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    }
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Razorpay fetch payment failed: ${err.error?.description || res.statusText}`)
    }

    const data = await res.json()
    return {
      paymentId: data.id,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      method: data.method,
    }
  }

  async fetchOrder(orderId: string): Promise<OrderResult> {
    const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Razorpay fetch order failed: ${err.error?.description || res.statusText}`)
    }

    const data = await res.json()
    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    }
  }

  async refundPayment(paymentId: string, amountPaise?: number): Promise<RefundResult> {
    const body: Record<string, unknown> = {}
    if (amountPaise) body.amount = amountPaise

    const res = await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Razorpay refund failed: ${err.error?.description || res.statusText}`)
    }

    const data = await res.json()
    return {
      refundId: data.id,
      amount: data.amount,
      status: data.status,
    }
  }
}

/**
 * Mock Payment Provider for dev and test environments when real credentials are not present.
 */
export class MockPaymentProvider implements PaymentProvider {
  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    const randomHex = crypto.randomBytes(8).toString('hex')
    return {
      orderId: `order_mock_${randomHex}`,
      amount: input.amountPaise,
      currency: input.currency || 'INR',
      status: 'created',
    }
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    return {
      paymentId,
      orderId: 'order_mock_test',
      amount: 250000,
      currency: 'INR',
      status: 'captured',
      method: 'UPI',
    }
  }

  async fetchOrder(orderId: string): Promise<OrderResult> {
    return {
      orderId,
      amount: 250000,
      currency: 'INR',
      status: 'created',
    }
  }

  async refundPayment(paymentId: string, amountPaise?: number): Promise<RefundResult> {
    return {
      refundId: `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`,
      amount: amountPaise || 250000,
      status: 'processed',
    }
  }
}

/**
 * Resolves active payment provider instance based on environment and credentials.
 */
export function getPaymentProvider(): PaymentProvider {
  if (
    process.env.NODE_ENV !== 'test' &&
    env.RAZORPAY_KEY_ID &&
    env.RAZORPAY_KEY_SECRET &&
    !env.RAZORPAY_KEY_ID.includes('placeholder')
  ) {
    return new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET)
  }
  return new MockPaymentProvider()
}
