import { describe, it, expect } from 'vitest'
import {
  formatDate,
  getKolkataDateString,
  compareKolkataDates,
  isFutureDate,
} from '@/lib/date'

describe('Date & Timezone Utilities (Asia/Kolkata)', () => {
  // 2026-10-24 10:00:00 UTC is 2026-10-24 15:30:00 IST
  const testDate = new Date('2026-10-24T10:00:00Z')

  describe('formatDate', () => {
    it('returns N/A for null or undefined input', () => {
      expect(formatDate(null)).toBe('N/A')
      expect(formatDate(undefined)).toBe('N/A')
    })

    it('returns Invalid Date for malformed inputs', () => {
      expect(formatDate('invalid-date-string')).toBe('Invalid Date')
    })

    it('formats short date representation in Asia/Kolkata', () => {
      const formatted = formatDate(testDate, 'short')
      expect(formatted).toContain('24')
      expect(formatted).toContain('Oct')
    })

    it('formats medium date representation with year', () => {
      const formatted = formatDate(testDate, 'medium')
      expect(formatted).toContain('24')
      expect(formatted).toContain('Oct')
      expect(formatted).toContain('2026')
    })

    it('formats ISO calendar date string (YYYY-MM-DD) via dateOnly', () => {
      expect(formatDate(testDate, 'dateOnly')).toBe('2026-10-24')
    })

    it('correctly shifts date across UTC midnight for Asia/Kolkata (+05:30)', () => {
      // 2026-10-23 20:00:00 UTC is 2026-10-24 01:30:00 IST
      const eveningUtc = new Date('2026-10-23T20:00:00Z')
      expect(getKolkataDateString(eveningUtc)).toBe('2026-10-24')
    })
  })

  describe('compareKolkataDates', () => {
    it('returns 0 for timestamps occurring on the same calendar day in Kolkata', () => {
      const morning = '2026-10-24T02:00:00Z' // 07:30 IST
      const evening = '2026-10-24T14:00:00Z' // 19:30 IST
      expect(compareKolkataDates(morning, evening)).toBe(0)
    })

    it('returns -1 when dateA is before dateB calendar day', () => {
      const yesterday = '2026-10-23T10:00:00Z'
      const today = '2026-10-24T10:00:00Z'
      expect(compareKolkataDates(yesterday, today)).toBe(-1)
    })

    it('returns 1 when dateA is after dateB calendar day', () => {
      const tomorrow = '2026-10-25T10:00:00Z'
      const today = '2026-10-24T10:00:00Z'
      expect(compareKolkataDates(tomorrow, today)).toBe(1)
    })
  })

  describe('isFutureDate', () => {
    const ref = new Date('2026-10-24T12:00:00Z')

    it('returns true for future dates', () => {
      expect(isFutureDate('2026-10-25T12:00:00Z', ref)).toBe(true)
    })

    it('returns false for past or identical dates', () => {
      expect(isFutureDate('2026-10-23T12:00:00Z', ref)).toBe(false)
      expect(isFutureDate('2026-10-24T12:00:00Z', ref)).toBe(false)
    })
  })
})
