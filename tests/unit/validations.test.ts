import { describe, it, expect } from 'vitest'
import {
  PhoneSchema,
  PasswordSchema,
  StudentRegistrationSchema,
  TournamentSchema,
  FeeSchema,
  ChatMessageSchema,
  BroadcastSchema,
} from '@/lib/validations'

describe('Input Validation Schemas & Sanitization Transforms', () => {
  describe('PhoneSchema', () => {
    it('should validate exactly 10 digits', () => {
      expect(PhoneSchema.safeParse('9876543210').success).toBe(true)
      expect(PhoneSchema.safeParse('1234567890').success).toBe(true)
      expect(PhoneSchema.safeParse('123456789').success).toBe(false)
      expect(PhoneSchema.safeParse('12345678901').success).toBe(false)
      expect(PhoneSchema.safeParse('98765abcde').success).toBe(false)
    })
  })

  describe('PasswordSchema', () => {
    it('should enforce 8 to 100 characters', () => {
      expect(PasswordSchema.safeParse('12345678').success).toBe(true)
      expect(PasswordSchema.safeParse('1234567').success).toBe(false)
      expect(PasswordSchema.safeParse('a'.repeat(101)).success).toBe(false)
    })
  })

  describe('StudentRegistrationSchema', () => {
    it('should validate and sanitize student input', () => {
      const parsed = StudentRegistrationSchema.parse({
        name: '  <b>Rohan</b> Sharma  ',
        batch: 'ADVANCED',
        age: '18',
        phone: '9876543210',
        password: 'SecurePassword123',
        coachName: 'Coach <script>alert(1)</script>Amit',
      })

      expect(parsed.name).toBe('Rohan Sharma')
      expect(parsed.age).toBe(18)
      expect(parsed.batch).toBe('ADVANCED')
      expect(parsed.coachName).toBe('Coach Amit')
    })

    it('should reject invalid age ranges', () => {
      const parseYoung = StudentRegistrationSchema.safeParse({
        name: 'Young Kid',
        batch: 'BEGINNER',
        age: 4,
        phone: '9876543210',
        password: 'SecurePassword123',
      })
      expect(parseYoung.success).toBe(false)

      const parseOld = StudentRegistrationSchema.safeParse({
        name: 'Senior Player',
        batch: 'BEGINNER',
        age: 80,
        phone: '9876543210',
        password: 'SecurePassword123',
      })
      expect(parseOld.success).toBe(false)
    })
  })

  describe('TournamentSchema', () => {
    it('should parse valid tournament and sanitize title/venue', () => {
      const parsed = TournamentSchema.parse({
        name: 'National <img src=x> Open',
        venue: 'Stadium 1',
        level: 'INTERMEDIATE',
        entryFee: '750',
        date: '2026-12-01',
      })

      expect(parsed.name).toBe('National Open')
      expect(parsed.entryFee).toBe(750)
      expect(parsed.date).toBeInstanceOf(Date)
    })

    it('should reject negative entry fee', () => {
      const res = TournamentSchema.safeParse({
        name: 'National Open',
        venue: 'Stadium 1',
        level: 'INTERMEDIATE',
        entryFee: -100,
        date: '2026-12-01',
      })
      expect(res.success).toBe(false)
    })
  })

  describe('FeeSchema', () => {
    it('should require valid student UUID and positive amount', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const parsed = FeeSchema.parse({
        studentId: validUuid,
        amount: '2500',
        dueDate: '2026-11-01',
        interval: 'MONTHLY',
      })

      expect(parsed.studentId).toBe(validUuid)
      expect(parsed.amount).toBe(2500)
      expect(parsed.dueDate).toBeInstanceOf(Date)
      expect(parsed.interval).toBe('MONTHLY')

      expect(
        FeeSchema.safeParse({
          studentId: 'not-a-uuid',
          amount: 2500,
          dueDate: '2026-11-01',
        }).success
      ).toBe(false)
    })
  })

  describe('ChatMessageSchema', () => {
    it('should sanitize content and accept valid categories', () => {
      const parsed = ChatMessageSchema.parse({
        content: 'Great game <script>hack()</script> today!',
        category: 'BATCH',
        batchType: 'ADVANCED',
      })

      expect(parsed.content).toBe('Great game today!')
      expect(parsed.category).toBe('BATCH')
    })
  })

  describe('BroadcastSchema', () => {
    it('should sanitize announcement title and message', () => {
      const parsed = BroadcastSchema.parse({
        title: 'Important: Practice Rescheduled <style>body{color:red}</style>',
        message: 'Please assemble at Court 3.',
        category: 'URGENT',
      })

      expect(parsed.title).toBe('Important: Practice Rescheduled')
      expect(parsed.message).toBe('Please assemble at Court 3.')
      expect(parsed.category).toBe('URGENT')
    })
  })
})
