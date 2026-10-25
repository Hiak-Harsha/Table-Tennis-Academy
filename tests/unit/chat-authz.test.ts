import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getChatMessagesAction, getChatRecipientsAction } from '@/actions/chat'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth-guard', () => ({
  requireAny: vi.fn(),
  requireAuth: vi.fn(),
  requireStudent: vi.fn(),
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    chatReadReceipt: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { default: mockPrisma }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Chat Authorization & Privacy (Finding D1)', () => {
  const beginnerStudent = {
    id: 'user-std-beginner',
    role: 'STUDENT',
  }

  const studentProfile = {
    id: 'student-uuid-beg',
    userId: 'user-std-beginner',
    studentId: 'TTA-00100',
    fullName: 'Beginner Athlete',
    batchType: 'BEGINNER',
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const { requireAuth, requireAny } = await import('@/lib/auth-guard')
    vi.mocked(requireAuth).mockResolvedValue(beginnerStudent as any)
    vi.mocked(requireAny).mockResolvedValue(beginnerStudent as any)
  })

  it('strictly forces student batch to own assigned batch, ignoring client-supplied batchType (Fixes D1)', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(studentProfile as any)
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValueOnce([])

    await getChatMessagesAction({
      category: 'BATCH',
      batchType: 'ADVANCED', // Attacker student tries to read ADVANCED
    })

    // Verify findMany was called with the student's authoritative batch: BEGINNER
    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'BATCH',
          batchType: 'BEGINNER', // Not ADVANCED!
        }),
      })
    )
  })

  it('restricts student recipient list to Coach + same-batch peers only (Fixes D1)', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValueOnce(studentProfile as any)
    vi.mocked(prisma.student.findMany).mockResolvedValueOnce([
      { id: 'peer-1', fullName: 'Peer One', studentId: 'TTA-00101', batchType: 'BEGINNER' },
    ] as any)

    const recipients = await getChatRecipientsAction()

    // Verify prisma.student.findMany filtered by student's batchType
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batchType: 'BEGINNER',
        }),
      })
    )

    // Verify list contains Admin + peer, but no students from other batches
    expect(recipients[0].id).toBe('ADMIN')
    expect(recipients).toHaveLength(2)
    expect(recipients[1].id).toBe('peer-1')
  })

  it('allows admin to query any batch chat', async () => {
    const { requireAuth, requireAny } = await import('@/lib/auth-guard')
    vi.mocked(requireAuth).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as any)
    vi.mocked(requireAny).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as any)

    vi.mocked(prisma.chatMessage.findMany).mockResolvedValueOnce([])

    await getChatMessagesAction({
      category: 'BATCH',
      batchType: 'ADVANCED',
    })

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'BATCH',
          batchType: 'ADVANCED',
        }),
      })
    )
  })
})
