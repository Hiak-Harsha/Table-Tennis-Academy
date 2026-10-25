import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as tokenHandler } from '@/app/api/realtime/token/route'
import { GET as pollHandler } from '@/app/api/realtime/poll/route'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth-guard', () => ({
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    student: {
      findUnique: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
  }
  return { default: mockPrisma }
})

describe('Serverless Real-Time Capabilities & Short-Poll Fallback (Finding D2)', () => {
  const studentUser = {
    id: 'user-std-101',
    role: 'STUDENT',
  }

  const studentData = {
    id: 'std-101',
    userId: 'user-std-101',
    studentId: 'TTA-00101',
    batchType: 'BEGINNER',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Capability Token Generation (/api/realtime/token)', () => {
    it('issues signed capability token for authorized channels', async () => {
      const { getCurrentUser } = await import('@/lib/auth-guard')
      vi.mocked(getCurrentUser).mockResolvedValue(studentUser as any)
      vi.mocked(prisma.student.findUnique).mockResolvedValue(studentData as any)

      const req = new NextRequest('http://localhost/api/realtime/token', {
        method: 'POST',
        body: JSON.stringify({ channels: ['global', 'batch:BEGINNER'] }),
      })

      const res = await tokenHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.token).toBeDefined()
      expect(data.authorizedChannels).toEqual(['global', 'batch:BEGINNER'])
    })

    it('rejects subscription token request containing unauthorized channels', async () => {
      const { getCurrentUser } = await import('@/lib/auth-guard')
      vi.mocked(getCurrentUser).mockResolvedValue(studentUser as any)
      vi.mocked(prisma.student.findUnique).mockResolvedValue(studentData as any)

      const req = new NextRequest('http://localhost/api/realtime/token', {
        method: 'POST',
        body: JSON.stringify({ channels: ['admin:ops'] }), // Student attempting admin channel
      })

      const res = await tokenHandler(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toMatch(/unauthorized/i)
    })
  })

  describe('Short-Poll Database Fallback (/api/realtime/poll)', () => {
    it('fetches new messages and notifications from database since timestamp', async () => {
      const { getCurrentUser } = await import('@/lib/auth-guard')
      vi.mocked(getCurrentUser).mockResolvedValue(studentUser as any)
      vi.mocked(prisma.student.findUnique).mockResolvedValue(studentData as any)

      const since = new Date(Date.now() - 5000).toISOString()
      const mockMsg = {
        id: 'msg-recent-1',
        content: 'New message',
        category: 'GLOBAL',
        createdAt: new Date(),
      }
      const mockNotif = {
        id: 'notif-recent-1',
        message: 'New fee notice',
        createdAt: new Date(),
      }

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValueOnce([mockMsg as any])
      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([mockNotif as any])

      const req = new NextRequest(`http://localhost/api/realtime/poll?channels=global&since=${encodeURIComponent(since)}`, {
        method: 'GET',
      })

      const res = await pollHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].id).toBe('msg-recent-1')
      expect(data.notifications).toHaveLength(1)
      expect(data.notifications[0].id).toBe('notif-recent-1')
    })
  })
})
