import { describe, it, expect } from 'vitest'
import { canTransitionPayment, assertValidPaymentTransition } from '@/lib/payment-state'

describe('Payment State Machine', () => {
  it('should allow valid payment status transitions', () => {
    // Normal successful flow
    expect(canTransitionPayment('CREATED', 'AUTHORIZED')).toBe(true)
    expect(canTransitionPayment('CREATED', 'CAPTURED')).toBe(true)
    expect(canTransitionPayment('AUTHORIZED', 'CAPTURED')).toBe(true)

    // Failure flow
    expect(canTransitionPayment('CREATED', 'FAILED')).toBe(true)
    expect(canTransitionPayment('AUTHORIZED', 'FAILED')).toBe(true)

    // Refund flow
    expect(canTransitionPayment('CAPTURED', 'REFUNDED')).toBe(true)

    // Identity (idempotent same state)
    expect(canTransitionPayment('CAPTURED', 'CAPTURED')).toBe(true)
  })

  it('should reject illegal payment state transitions', () => {
    // Once failed, cannot jump to captured
    expect(canTransitionPayment('FAILED', 'CAPTURED')).toBe(false)
    expect(canTransitionPayment('FAILED', 'CREATED')).toBe(false)

    // Once refunded, cannot jump to captured
    expect(canTransitionPayment('REFUNDED', 'CAPTURED')).toBe(false)
    expect(canTransitionPayment('REFUNDED', 'CREATED')).toBe(false)

    // Cannot refund an uncaptured payment
    expect(canTransitionPayment('CREATED', 'REFUNDED')).toBe(false)
    expect(canTransitionPayment('AUTHORIZED', 'REFUNDED')).toBe(false)
  })

  it('assertValidPaymentTransition should throw descriptive errors on illegal transitions', () => {
    expect(() => assertValidPaymentTransition('FAILED', 'CAPTURED')).toThrow(
      'Illegal payment state transition from FAILED to CAPTURED'
    )
    expect(() => assertValidPaymentTransition('CREATED', 'CAPTURED')).not.toThrow()
  })
})
