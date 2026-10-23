import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPhone, formatPhoneDisplay } from '@/lib/phone'

describe('Phone Normalization & E.164 Engine', () => {
  it('should normalize standard 10-digit Indian numbers to E.164 (+91XXXXXXXXXX)', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210')
    expect(normalizePhone('8765432109')).toBe('+918765432109')
    expect(normalizePhone('7654321098')).toBe('+917654321098')
    expect(normalizePhone('6543210987')).toBe('+916543210987')
  })

  it('should handle numbers already formatted with +91 or 91 or leading 0', () => {
    expect(normalizePhone('+919876543210')).toBe('+919876543210')
    expect(normalizePhone('919876543210')).toBe('+919876543210')
    expect(normalizePhone('09876543210')).toBe('+919876543210')
  })

  it('should strip spaces, dashes, and parentheses gracefully', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210')
    expect(normalizePhone('(0) 98765 43210')).toBe('+919876543210')
    expect(normalizePhone('98765 43210')).toBe('+919876543210')
  })

  it('should reject invalid numbers not matching Indian mobile specs', () => {
    // Numbers starting with 1-5 are not Indian mobile numbers
    expect(() => normalizePhone('5876543210')).toThrow()
    expect(() => normalizePhone('1234567890')).toThrow()
    // Wrong length
    expect(() => normalizePhone('987654321')).toThrow()
    expect(() => normalizePhone('987654321000')).toThrow()
    // Letters
    expect(() => normalizePhone('987654321a')).toThrow()
  })

  it('isValidPhone should return boolean without throwing', () => {
    expect(isValidPhone('9876543210')).toBe(true)
    expect(isValidPhone('+91 98765 43210')).toBe(true)
    expect(isValidPhone('1234567890')).toBe(false)
    expect(isValidPhone('not-a-number')).toBe(false)
  })

  it('formatPhoneDisplay should format cleanly into +91 XXXXX XXXXX', () => {
    expect(formatPhoneDisplay('+919876543210')).toBe('+91 98765 43210')
    expect(formatPhoneDisplay('9876543210')).toBe('+91 98765 43210')
  })
})
