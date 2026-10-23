import { describe, it, expect } from 'vitest'
import { authorize, AuthAction } from '@/lib/auth-guard'
import { AuthenticatedUser } from '@/lib/session'

describe('Authorization Matrix (RBAC & Multi-tenant Boundaries)', () => {
  const resourceOwnerId = 'owner-uuid-1001'

  const anonUser = null

  const studentSelf: AuthenticatedUser = {
    id: 'user-uuid-1',
    role: 'STUDENT',
    phone: '9876543210',
    sessionId: 'session-1',
    name: 'Rohan Sharma',
    studentId: 'TTA-1001',
    internalStudentId: resourceOwnerId,
    student: {
      id: resourceOwnerId,
      studentId: 'TTA-1001',
      fullName: 'Rohan Sharma',
      batchType: 'ADVANCED',
      enrollmentStatus: 'ACTIVE',
    },
  }

  const studentOther: AuthenticatedUser = {
    id: 'user-uuid-2',
    role: 'STUDENT',
    phone: '9876543211',
    sessionId: 'session-2',
    name: 'Priya Patel',
    studentId: 'TTA-2002',
    internalStudentId: 'other-uuid-2002',
    student: {
      id: 'other-uuid-2002',
      studentId: 'TTA-2002',
      fullName: 'Priya Patel',
      batchType: 'BEGINNER',
      enrollmentStatus: 'ACTIVE',
    },
  }

  const adminUser: AuthenticatedUser = {
    id: 'admin-uuid-9',
    role: 'ADMIN',
    phone: '9999999999',
    sessionId: 'session-admin',
    name: 'Academy Admin',
  }

  const actions: AuthAction[] = ['READ', 'WRITE', 'DELETE', 'ADMIN']

  const expectedMatrix: Record<string, Record<AuthAction, boolean>> = {
    anon: {
      READ: false,
      WRITE: false,
      DELETE: false,
      ADMIN: false,
    },
    'student-self': {
      READ: true,
      WRITE: true,
      DELETE: false,
      ADMIN: false,
    },
    'student-other': {
      READ: false,
      WRITE: false,
      DELETE: false,
      ADMIN: false,
    },
    admin: {
      READ: true,
      WRITE: true,
      DELETE: true,
      ADMIN: true,
    },
  }

  const testUsers: Record<string, AuthenticatedUser | null> = {
    anon: anonUser,
    'student-self': studentSelf,
    'student-other': studentOther,
    admin: adminUser,
  }

  for (const roleKey of Object.keys(testUsers)) {
    describe(`Role: ${roleKey}`, () => {
      for (const action of actions) {
        const expected = expectedMatrix[roleKey][action]
        it(`should ${expected ? 'ALLOW' : 'DENY'} ${action} on owned resource`, () => {
          const user = testUsers[roleKey]
          const result = authorize(user, action, resourceOwnerId)
          expect(result).toBe(expected)
        })
      }
    })
  }

  it('should allow students to READ public/unscoped resources', () => {
    expect(authorize(studentSelf, 'READ')).toBe(true)
    expect(authorize(studentOther, 'READ')).toBe(true)
    expect(authorize(studentSelf, 'WRITE')).toBe(false)
    expect(authorize(studentOther, 'WRITE')).toBe(false)
    expect(authorize(studentSelf, 'DELETE')).toBe(false)
    expect(authorize(studentSelf, 'ADMIN')).toBe(false)
  })

  it('should deny anonymous users even on unscoped resources', () => {
    expect(authorize(anonUser, 'READ')).toBe(false)
    expect(authorize(anonUser, 'WRITE')).toBe(false)
  })
})
