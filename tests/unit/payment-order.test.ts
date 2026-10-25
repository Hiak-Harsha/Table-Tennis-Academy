import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPaymentOrderAction } from '@/actions/payments'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth-guard', () => ({
  requireStudent: vi.fn().mockResolvedValue({
    id: 'student-123',
    userId: 'user-123',
    studentId: 'TTA-01001',
    fullName: 'Test Athlete',
    age: 16,
    batchType: 'BEGINNER',
    enrollmentStatus: 'ACTIVE',
  }),
  requireAdmin: vi.fn().mockResolvedValue({
    id: 'admin-123',
    role: 'ADMIN',
  }),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    academyFee: {
      findUnique: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
    },
    tournamentPayment: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
  }
  return { default: mockPrisma }
})

describe('createPaymentOrderAction Order Creation Gaps (Finding C4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects order creation if fee is already PAID', async () => {
    vi.mocked(prisma.academyFee.findUnique).mockResolvedValueOnce({
      id: 'fee-paid',
      studentId: 'student-123',
      amount: 250000,
      status: 'PAID',
      interval: 'MONTHLY',
    } as any)

    const res = await createPaymentOrderAction({
      purpose: 'FEE',
      targetId: 'fee-paid',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/already.*paid/i)
  })

  it('rejects order creation if fee has a CAPTURED payment record in database', async () => {
    vi.mocked(prisma.academyFee.findUnique).mockResolvedValueOnce({
      id: 'fee-1',
      studentId: 'student-123',
      amount: 250000,
      status: 'DUE',
      interval: 'MONTHLY',
    } as any)

    vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({
      id: 'payment-captured-1',
      orderId: 'order_captured_123',
      status: 'CAPTURED',
      amount: 250000,
      currency: 'INR',
    } as any)

    const res = await createPaymentOrderAction({
      purpose: 'FEE',
      targetId: 'fee-1',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/already.*paid|captured/i)
  })

  it('reuses an existing open CREATED order for fee if still valid', async () => {
    vi.mocked(prisma.academyFee.findUnique).mockResolvedValueOnce({
      id: 'fee-1',
      studentId: 'student-123',
      amount: 250000,
      status: 'DUE',
      interval: 'MONTHLY',
    } as any)

    const recentDate = new Date(Date.now() - 2 * 60 * 1000) // 2 mins ago
    vi.mocked(prisma.payment.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'existing-payment-1',
        orderId: 'order_reusable_12345',
        status: 'CREATED',
        amount: 250000,
        currency: 'INR',
        createdAt: recentDate,
        purpose: 'FEE',
        targetId: 'fee-1',
      } as any)

    const res = await createPaymentOrderAction({
      purpose: 'FEE',
      targetId: 'fee-1',
    })

    expect(res.success).toBe(true)
    expect(res.orderId).toBe('order_reusable_12345')
    expect(prisma.payment.create).not.toHaveBeenCalled()
  })

  it('rejects tournament order if tournament registration deadline has passed', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce({
      id: 'tourn-expired',
      name: 'Autumn Open Championship',
      date: nextWeek,
      registrationDeadline: yesterday,
      entryFee: 50000,
      level: 'INTERMEDIATE',
      maxPlayers: 32,
    } as any)

    vi.mocked(prisma.tournamentPayment.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.student.findUnique).mockResolvedValueOnce({
      id: 'student-123',
      studentId: 'TTA-01001',
      fullName: 'Test Athlete',
      age: 16,
      batchType: 'BEGINNER',
      enrollmentStatus: 'ACTIVE',
    } as any)

    const res = await createPaymentOrderAction({
      purpose: 'TOURNAMENT',
      targetId: 'tourn-expired',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/deadline.*passed/i)
  })

  it('rejects tournament order if tournament has reached max player capacity', async () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

    vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce({
      id: 'tourn-full',
      name: 'Autumn Open Championship',
      date: nextWeek,
      registrationDeadline: tomorrow,
      entryFee: 50000,
      level: 'BEGINNER',
      maxPlayers: 16,
    } as any)

    vi.mocked(prisma.tournamentPayment.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.tournamentPayment.count).mockResolvedValueOnce(16)
    vi.mocked(prisma.student.findUnique).mockResolvedValueOnce({
      id: 'student-123',
      studentId: 'TTA-01001',
      fullName: 'Test Athlete',
      age: 16,
      batchType: 'BEGINNER',
      enrollmentStatus: 'ACTIVE',
    } as any)

    const res = await createPaymentOrderAction({
      purpose: 'TOURNAMENT',
      targetId: 'tourn-full',
    })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/maximum capacity/i)
  })
})
