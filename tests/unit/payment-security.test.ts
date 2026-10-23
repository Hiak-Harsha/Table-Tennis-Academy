import { describe, it, expect } from 'vitest'
import {
  verifyWebhookSignature,
  generateWebhookSignature,
  verifyPaymentSignature,
  generatePaymentSignature,
  generateUpiIntentUrl,
} from '@/lib/payment-security'

describe('Payment Security Engine', () => {
  const secret = 'test_webhook_secret_key_32_bytes_long'
  const samplePayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_12345',
          order_id: 'order_test_98765',
          amount: 250000,
        },
      },
    },
  })

  it('should verify a valid HMAC-SHA256 webhook signature', () => {
    const validSignature = generateWebhookSignature(samplePayload, secret)
    const isValid = verifyWebhookSignature(samplePayload, validSignature, secret)
    expect(isValid).toBe(true)
  })

  it('should reject a webhook signature if payload was tampered', () => {
    const signature = generateWebhookSignature(samplePayload, secret)
    const tamperedPayload = samplePayload.replace('250000', '100000')

    const isValid = verifyWebhookSignature(tamperedPayload, signature, secret)
    expect(isValid).toBe(false)
  })

  it('should reject a webhook signature generated with a different secret', () => {
    const attackerSecret = 'attacker_secret_different_key_32'
    const forgedSignature = generateWebhookSignature(samplePayload, attackerSecret)

    const isValid = verifyWebhookSignature(samplePayload, forgedSignature, secret)
    expect(isValid).toBe(false)
  })

  it('should reject empty or missing signature/body gracefully without throwing', () => {
    expect(verifyWebhookSignature('', 'signature', secret)).toBe(false)
    expect(verifyWebhookSignature(samplePayload, '', secret)).toBe(false)
    expect(verifyWebhookSignature(samplePayload, 'sig', '')).toBe(false)
  })

  it('should verify valid client payment signatures (orderId|paymentId)', () => {
    const orderId = 'order_abc123'
    const paymentId = 'pay_xyz789'
    const keySecret = 'sample_razorpay_key_secret'

    const signature = generatePaymentSignature(orderId, paymentId, keySecret)
    expect(verifyPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(true)
  })

  it('should reject invalid client payment signatures', () => {
    const orderId = 'order_abc123'
    const paymentId = 'pay_xyz789'
    const keySecret = 'sample_razorpay_key_secret'

    expect(verifyPaymentSignature(orderId, paymentId, 'invalid_sig_value', keySecret)).toBe(false)
    expect(verifyPaymentSignature(orderId, 'pay_tampered', generatePaymentSignature(orderId, paymentId, keySecret), keySecret)).toBe(false)
  })

  it('should generate authoritative NPCI UPI intent URI with paise properly converted to rupees', () => {
    const upiUri = generateUpiIntentUrl({
      vpa: 'tta.academy@upi',
      name: 'Table Tennis Academy',
      amountPaise: 250000, // 2500 INR
      orderId: 'order_12345',
      note: 'Academy Monthly Fee',
    })

    expect(upiUri).toContain('upi://pay?')
    expect(upiUri).toContain('pa=tta.academy@upi')
    expect(upiUri).toContain('am=2500.00')
    expect(upiUri).toContain('cu=INR')
    expect(upiUri).toContain('tr=order_12345')
  })
})
