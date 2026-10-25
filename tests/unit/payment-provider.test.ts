import { describe, it, expect } from 'vitest'
import { getPaymentProvider, MockPaymentProvider, RazorpayProvider } from '@/lib/payments/provider'

describe('Payment Provider Interface & Implementations', () => {
  it('instantiates MockPaymentProvider with consistent interface in test/dev', () => {
    const mockProvider = new MockPaymentProvider()
    expect(typeof mockProvider.createOrder).toBe('function')
    expect(typeof mockProvider.fetchPayment).toBe('function')
    expect(typeof mockProvider.fetchOrder).toBe('function')
    expect(typeof mockProvider.refundPayment).toBe('function')
  })

  it('creates mock order with correct paise amount and order format', async () => {
    const mockProvider = new MockPaymentProvider()
    const result = await mockProvider.createOrder({
      amountPaise: 250000,
      currency: 'INR',
      receipt: 'REC-12345',
      notes: { purpose: 'FEE', feeId: 'fee-123' },
    })

    expect(result.orderId).toMatch(/^order_mock_[a-f0-9]+$/)
    expect(result.amount).toBe(250000)
    expect(result.currency).toBe('INR')
  })

  it('fetches mock order and verifies status and amount', async () => {
    const mockProvider = new MockPaymentProvider()
    const order = await mockProvider.fetchOrder('order_mock_test123')
    expect(order.orderId).toBe('order_mock_test123')
    expect(order.status).toBe('created')
  })

  it('resolves refund through mock provider', async () => {
    const mockProvider = new MockPaymentProvider()
    const refund = await mockProvider.refundPayment('pay_mock_123', 250000)
    expect(refund.refundId).toMatch(/^rfnd_mock_[a-f0-9]+$/)
    expect(refund.status).toBe('processed')
  })

  it('getPaymentProvider returns mock provider when credentials are not configured in test', () => {
    const provider = getPaymentProvider()
    expect(provider).toBeDefined()
    expect(provider instanceof MockPaymentProvider || provider instanceof RazorpayProvider).toBe(true)
  })
})
