import { describe, it, expect } from 'vitest'
import {
  isValidStudentStatusTransition,
  StudentEnrollmentStatusEnum,
} from '@/lib/student-state'

describe('Student Enrollment Status State Machine', () => {
  describe('Zod Enum Validation', () => {
    it('accepts all legal status values', () => {
      expect(StudentEnrollmentStatusEnum.parse('ACTIVE')).toBe('ACTIVE')
      expect(StudentEnrollmentStatusEnum.parse('INACTIVE')).toBe('INACTIVE')
      expect(StudentEnrollmentStatusEnum.parse('SUSPENDED')).toBe('SUSPENDED')
      expect(StudentEnrollmentStatusEnum.parse('GRADUATED')).toBe('GRADUATED')
    })

    it('rejects invalid and arbitrary string statuses', () => {
      expect(StudentEnrollmentStatusEnum.safeParse('DELETED').success).toBe(false)
      expect(StudentEnrollmentStatusEnum.safeParse('EXPELLED').success).toBe(false)
      expect(StudentEnrollmentStatusEnum.safeParse('').success).toBe(false)
    })
  })

  describe('Lifecycle State Transitions', () => {
    it('allows ACTIVE students to become INACTIVE, SUSPENDED, or GRADUATED', () => {
      expect(isValidStudentStatusTransition('ACTIVE', 'INACTIVE').valid).toBe(true)
      expect(isValidStudentStatusTransition('ACTIVE', 'SUSPENDED').valid).toBe(true)
      expect(isValidStudentStatusTransition('ACTIVE', 'GRADUATED').valid).toBe(true)
    })

    it('allows INACTIVE students to reactivate or graduate', () => {
      expect(isValidStudentStatusTransition('INACTIVE', 'ACTIVE').valid).toBe(true)
      expect(isValidStudentStatusTransition('INACTIVE', 'GRADUATED').valid).toBe(true)
      expect(isValidStudentStatusTransition('INACTIVE', 'SUSPENDED').valid).toBe(true)
    })

    it('allows SUSPENDED students to be reinstated or moved to inactive, but not directly graduated', () => {
      expect(isValidStudentStatusTransition('SUSPENDED', 'ACTIVE').valid).toBe(true)
      expect(isValidStudentStatusTransition('SUSPENDED', 'INACTIVE').valid).toBe(true)
      const res = isValidStudentStatusTransition('SUSPENDED', 'GRADUATED')
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('Illegal transition')
    })

    it('allows GRADUATED alumni to re-enroll as ACTIVE', () => {
      expect(isValidStudentStatusTransition('GRADUATED', 'ACTIVE').valid).toBe(true)
      expect(isValidStudentStatusTransition('GRADUATED', 'SUSPENDED').valid).toBe(false)
    })

    it('rejects no-op transitions to the identical status', () => {
      const res = isValidStudentStatusTransition('ACTIVE', 'ACTIVE')
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('already ACTIVE')
    })

    it('rejects illegal or unrecognized status values gracefully', () => {
      const res = isValidStudentStatusTransition('UNKNOWN', 'ACTIVE')
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('Invalid current status')
    })
  })
})
