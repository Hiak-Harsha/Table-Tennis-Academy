import crypto from 'crypto'
import { paiseToRupees } from './currency'

/**
 * Timing-safe string comparison preventing side-channel timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }

  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  if (bufA.length !== bufB.length) {
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Verifies Razorpay/HMAC-SHA256 webhook signatures using constant-time comparison.
 * @param rawBody Unparsed exact raw body string or buffer received in the HTTP request
 * @param signature Value from 'x-razorpay-signature' header
 * @param secret Configured webhook secret
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) {
    return false
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    return safeCompare(expected, signature)
  } catch (err) {
    console.error('[PAYMENT_SECURITY] Error verifying webhook signature:', err)
    return false
  }
}

/**
 * Generates an HMAC-SHA256 signature for testing and webhook replay fixtures.
 */
export function generateWebhookSignature(
  rawBody: string | Buffer,
  secret: string
): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

/**
 * Verifies Razorpay client-side payment signature: HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false
  }

  try {
    const payload = `${orderId}|${paymentId}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return safeCompare(expected, signature)
  } catch (err) {
    console.error('[PAYMENT_SECURITY] Error verifying payment signature:', err)
    return false
  }
}

/**
 * Generates payment signature for testing and verification fixtures.
 */
export function generatePaymentSignature(
  orderId: string,
  paymentId: string,
  secret: string
): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

export interface UpiIntentParams {
  vpa: string
  name: string
  amountPaise: number
  orderId: string
  note: string
}

/**
 * Generates an authoritative NPCI UPI Intent URI for mobile app deep-linking (GPay/PhonePe/Paytm).
 */
export function generateUpiIntentUrl(params: UpiIntentParams): string {
  const rupees = paiseToRupees(params.amountPaise).toFixed(2)
  const encodedName = encodeURIComponent(params.name)
  const encodedNote = encodeURIComponent(params.note)
  const encodedTr = encodeURIComponent(params.orderId)

  return `upi://pay?pa=${params.vpa}&pn=${encodedName}&am=${rupees}&cu=INR&tn=${encodedNote}&tr=${encodedTr}`
}
