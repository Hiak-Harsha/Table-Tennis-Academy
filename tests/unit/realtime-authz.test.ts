import { describe, it, expect } from 'vitest'
import {
  authorizeChannelSubscription,
  getDmChannelName,
  SubscriptionContext,
} from '@/lib/realtime/authz'

describe('Real-Time Channel Authorization (Multi-tenant & Role Boundary Security)', () => {
  const studentContext: SubscriptionContext = {
    userId: 'user-std-101',
    role: 'STUDENT',
    studentId: 'TTA-101',
    internalStudentId: 'std-uuid-101',
    batchType: 'ADVANCED',
  }

  const otherStudentContext: SubscriptionContext = {
    userId: 'user-std-202',
    role: 'STUDENT',
    studentId: 'TTA-202',
    internalStudentId: 'std-uuid-202',
    batchType: 'BEGINNER',
  }

  const studentNoBatch: SubscriptionContext = {
    userId: 'user-std-303',
    role: 'STUDENT',
  }

  const adminContext: SubscriptionContext = {
    userId: 'user-admin-999',
    role: 'ADMIN',
  }

  describe('Invalid or Malformed Channel Names', () => {
    it('rejects empty or non-string channels', () => {
      expect(authorizeChannelSubscription(studentContext, '')).toBe(false)
      // @ts-expect-error testing invalid argument runtime guard
      expect(authorizeChannelSubscription(studentContext, null)).toBe(false)
      // @ts-expect-error testing invalid argument runtime guard
      expect(authorizeChannelSubscription(studentContext, undefined)).toBe(false)
    })

    it('rejects unrecognized channel prefixes', () => {
      expect(authorizeChannelSubscription(studentContext, 'unknown:channel')).toBe(false)
      expect(authorizeChannelSubscription(adminContext, 'unknown:channel')).toBe(false)
    })
  })

  describe('Global Channel ("global")', () => {
    it('allows both student and admin subscribers', () => {
      expect(authorizeChannelSubscription(studentContext, 'global')).toBe(true)
      expect(authorizeChannelSubscription(otherStudentContext, 'global')).toBe(true)
      expect(authorizeChannelSubscription(adminContext, 'global')).toBe(true)
    })
  })

  describe('Admin Operations Channel ("admin:ops")', () => {
    it('allows admins to subscribe', () => {
      expect(authorizeChannelSubscription(adminContext, 'admin:ops')).toBe(true)
    })

    it('strictly denies students from subscribing', () => {
      expect(authorizeChannelSubscription(studentContext, 'admin:ops')).toBe(false)
      expect(authorizeChannelSubscription(otherStudentContext, 'admin:ops')).toBe(false)
      expect(authorizeChannelSubscription(studentNoBatch, 'admin:ops')).toBe(false)
    })
  })

  describe('Batch Channels ("batch:<batchType>")', () => {
    it('allows students to subscribe to their assigned batch (case-insensitive)', () => {
      expect(authorizeChannelSubscription(studentContext, 'batch:ADVANCED')).toBe(true)
      expect(authorizeChannelSubscription(studentContext, 'batch:advanced')).toBe(true)
      expect(authorizeChannelSubscription(otherStudentContext, 'batch:BEGINNER')).toBe(true)
    })

    it('denies students from eavesdropping on other batches', () => {
      expect(authorizeChannelSubscription(studentContext, 'batch:BEGINNER')).toBe(false)
      expect(authorizeChannelSubscription(studentContext, 'batch:INTERMEDIATE')).toBe(false)
      expect(authorizeChannelSubscription(otherStudentContext, 'batch:ADVANCED')).toBe(false)
    })

    it('denies students without an assigned batch', () => {
      expect(authorizeChannelSubscription(studentNoBatch, 'batch:BEGINNER')).toBe(false)
      expect(authorizeChannelSubscription(studentNoBatch, 'batch:ADVANCED')).toBe(false)
    })

    it('allows admins to monitor any batch channel', () => {
      expect(authorizeChannelSubscription(adminContext, 'batch:BEGINNER')).toBe(true)
      expect(authorizeChannelSubscription(adminContext, 'batch:INTERMEDIATE')).toBe(true)
      expect(authorizeChannelSubscription(adminContext, 'batch:ADVANCED')).toBe(true)
    })
  })

  describe('Personal User Channels ("user:<userId>")', () => {
    it('allows users to subscribe to their own user channel', () => {
      expect(authorizeChannelSubscription(studentContext, 'user:user-std-101')).toBe(true)
      expect(authorizeChannelSubscription(otherStudentContext, 'user:user-std-202')).toBe(true)
    })

    it('denies users from subscribing to other users channels', () => {
      expect(authorizeChannelSubscription(studentContext, 'user:user-std-202')).toBe(false)
      expect(authorizeChannelSubscription(otherStudentContext, 'user:user-std-101')).toBe(false)
    })

    it('allows admins to subscribe to any user channel for support/ops', () => {
      expect(authorizeChannelSubscription(adminContext, 'user:user-std-101')).toBe(true)
      expect(authorizeChannelSubscription(adminContext, 'user:user-std-202')).toBe(true)
    })
  })

  describe('Direct Message Channels ("dm:<idA>:<idB>")', () => {
    it('allows participants identified by userId or studentId to subscribe', () => {
      // By userId
      expect(authorizeChannelSubscription(studentContext, 'dm:user-std-101:user-std-202')).toBe(true)
      expect(authorizeChannelSubscription(otherStudentContext, 'dm:user-std-101:user-std-202')).toBe(true)

      // By studentId / internalStudentId
      expect(authorizeChannelSubscription(studentContext, 'dm:std-uuid-101:std-uuid-202')).toBe(true)
      expect(authorizeChannelSubscription(studentContext, 'dm:TTA-101:TTA-202')).toBe(true)
    })

    it('denies non-participating third-party users', () => {
      expect(authorizeChannelSubscription(studentNoBatch, 'dm:user-std-101:user-std-202')).toBe(false)
    })

    it('allows admins to subscribe to any DM channel for audit/safety', () => {
      expect(authorizeChannelSubscription(adminContext, 'dm:user-std-101:user-std-202')).toBe(true)
    })

    it('rejects malformed DM channel names without exactly 2 IDs', () => {
      expect(authorizeChannelSubscription(studentContext, 'dm:user-std-101')).toBe(false)
      expect(authorizeChannelSubscription(studentContext, 'dm:a:b:c')).toBe(false)
    })
  })

  describe('getDmChannelName Helper', () => {
    it('creates canonical lexicographically ordered channel names', () => {
      const ch1 = getDmChannelName('user-alpha', 'user-beta')
      const ch2 = getDmChannelName('user-beta', 'user-alpha')
      expect(ch1).toBe('dm:user-alpha:user-beta')
      expect(ch2).toBe('dm:user-alpha:user-beta')
      expect(ch1).toBe(ch2)
    })
  })
})
