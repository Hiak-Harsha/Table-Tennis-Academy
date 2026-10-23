export type PaymentState = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED'

const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
}

/**
 * Checks whether a payment status transition is legally permitted.
 */
export function canTransitionPayment(from: PaymentState, to: PaymentState): boolean {
  if (from === to) return true
  const allowed = VALID_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

/**
 * Validates transition or throws descriptive domain error.
 */
export function assertValidPaymentTransition(from: PaymentState, to: PaymentState): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Illegal payment state transition from ${from} to ${to}`)
  }
}
