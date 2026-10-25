import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordCashPaymentAction, refundPaymentAction } from '@/actions/payments'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth-guard', () => ({
  requireStudent: vi.fn(),
  requireAdmin: vi.fn().mockResolvedValue({
    id: 'admin-123',
    role: 'ADMIN',
  }),
}))

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    academyFee: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tournamentPayment: {
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { default: mockPrisma }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Admin Payment Operations (Cash & Refunds)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records offline cash payment in an audited database transaction', async () => {
    vi.mocked(prisma.academyFee.findUnique).mockResolvedValueOnce({
      id: 'fee-123',
      studentId: 'student-123',
      amount: 250000,
      status: 'DUE',
      interval: 'MONTHLY',
      student: { userId: 'user-123' },
    } as any)

    vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, {}, {}] as any)

    const res = await recordCashPaymentAction({
      studentId: 'student-123',
      feeId: 'fee-123',
      receiptNote: 'Collected in cash at front desk',
    })

    expect(res.success).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('rejects cash payment if fee is already marked PAID', async () => {
    vi.mocked(prisma.academyFee.findUnique).mockResolvedValueOnce({
      id: 'fee-paid',
      studentId: 'student-123',
      amount: 250000,
      status: 'PAID',
      interval: 'MONTHLY',
      student: { userId: 'user-123' },
    } as any)

    const res = await recordCashPaymentAction({
      studentId: 'student-123',
      feeId: 'fee-paid',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/already.*paid/i)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('successfully processes refund for a captured payment', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
      id: 'pay-captured-1',
      studentId: 'student-123',
      purpose: 'FEE',
      targetId: 'fee-123',
      amount: 250000,
      status: 'CAPTURED',
      provider: 'OFFLINE_CASH',
      student: { userId: 'user-123' },
    } as any)

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const mockTx = {
        payment: { update: vi.fn() },
        academyFee: { update: vi.fn() },
        tournamentPayment: { updateMany: vi.fn() },
        notification: { create: vi.fn() },
      }
      return await callback(mockTx)
    })

    const res = await refundPaymentAction({
      paymentId: 'pay-captured-1',
      reason: 'Student relocated',
    })

    expect(res.success).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('rejects refund if payment is not in CAPTURED state', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
      id: 'pay-created-1',
      studentId: 'student-123',
      amount: 250000,
      status: 'CREATED',
      provider: 'RAZORPAY',
    } as any)

    const res = await refundPaymentAction({
      paymentId: 'pay-created-1',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Illegal payment state transition/i)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
