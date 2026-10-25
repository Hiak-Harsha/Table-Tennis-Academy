import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getVerifiedReceipt } from '@/lib/receipt'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    academyFee: {
      findFirst: vi.fn(),
    },
    tournamentPayment: {
      findFirst: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
    },
  }
  return { default: mockPrisma }
})

describe('Receipt Verification Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves verified receipt from AcademyFee record with student details', async () => {
    const receiptNo = 'REC-TEST-FEE-123'
    const now = new Date()

    vi.mocked(prisma.academyFee.findFirst).mockResolvedValueOnce({
      id: 'fee-123',
      studentId: 'student-123',
      amount: 250000,
      interval: 'MONTHLY',
      status: 'PAID',
      method: 'UPI',
      paymentDate: now,
      receiptUrl: `/receipts/${receiptNo}.pdf`,
      qrCodeHash: `VERIFIED_${receiptNo}`,
      student: {
        id: 'student-123',
        fullName: 'Athlete One',
        studentId: 'TTA-01001',
        batchType: 'INTERMEDIATE',
      },
    } as any)

    vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({
      id: 'payment-123',
      orderId: 'order_123',
      paymentId: 'pay_123',
      method: 'UPI',
    } as any)

    const receipt = await getVerifiedReceipt(receiptNo)
    expect(receipt).not.toBeNull()
    expect(receipt?.receiptNo).toBe(receiptNo)
    expect(receipt?.studentName).toBe('Athlete One')
    expect(receipt?.studentId).toBe('TTA-01001')
    expect(receipt?.amountPaise).toBe(250000)
    expect(receipt?.method).toBe('UPI')
    expect(receipt?.purpose).toBe('FEE')
  })

  it('resolves verified receipt from TournamentPayment record', async () => {
    const receiptNo = 'REC-TEST-TOURN-456'
    const now = new Date()

    vi.mocked(prisma.academyFee.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tournamentPayment.findFirst).mockResolvedValueOnce({
      id: 'tp-123',
      studentId: 'student-123',
      tournamentId: 'tourn-123',
      amountPaid: 50000,
      paymentStatus: 'PAID',
      paymentDate: now,
      confirmationDetails: receiptNo,
      student: {
        id: 'student-123',
        fullName: 'Athlete Two',
        studentId: 'TTA-01002',
        batchType: 'ADVANCED',
      },
      tournament: {
        id: 'tourn-123',
        name: 'State Ranking Championship',
      },
    } as any)

    vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(null)

    const receipt = await getVerifiedReceipt(receiptNo)
    expect(receipt).not.toBeNull()
    expect(receipt?.receiptNo).toBe(receiptNo)
    expect(receipt?.studentName).toBe('Athlete Two')
    expect(receipt?.studentId).toBe('TTA-01002')
    expect(receipt?.amountPaise).toBe(50000)
    expect(receipt?.purpose).toBe('TOURNAMENT')
    expect(receipt?.itemTitle).toContain('State Ranking Championship')
  })

  it('returns null for nonexistent receipt number', async () => {
    vi.mocked(prisma.academyFee.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tournamentPayment.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(null)

    const receipt = await getVerifiedReceipt('REC-NONEXISTENT')
    expect(receipt).toBeNull()
  })

  it('returns null for blank or empty receipt input', async () => {
    const receipt = await getVerifiedReceipt('   ')
    expect(receipt).toBeNull()
  })
})
