import { describe, it, expect } from 'vitest'
import { generateNumericOtp, hashOtpCode, verifyOtpCode } from '@/lib/otp'

describe('OTP Cryptographic Security Engine', () => {
  it('should generate 6-digit numeric OTP codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateNumericOtp()
      expect(code).toMatch(/^\d{6}$/)
      expect(code.length).toBe(6)
    }
  })

  it('should hash code with unique salt and verify accurately with timing-safe comparison', () => {
    const code = '583921'
    const salt = 'random_hex_salt_32_chars'
    const hash = hashOtpCode(code, salt)

    expect(verifyOtpCode(code, hash, salt)).toBe(true)
  })

  it('should reject incorrect code', () => {
    const code = '583921'
    const wrongCode = '583922'
    const salt = 'random_hex_salt_32_chars'
    const hash = hashOtpCode(code, salt)

    expect(verifyOtpCode(wrongCode, hash, salt)).toBe(false)
  })

  it('should reject if salt is altered', () => {
    const code = '583921'
    const salt = 'salt_a'
    const wrongSalt = 'salt_b'
    const hash = hashOtpCode(code, salt)

    expect(verifyOtpCode(code, hash, wrongSalt)).toBe(false)
  })

  it('should reject empty or null values safely', () => {
    expect(verifyOtpCode('', 'hash', 'salt')).toBe(false)
    expect(verifyOtpCode('123456', '', 'salt')).toBe(false)
    expect(verifyOtpCode('123456', 'hash', '')).toBe(false)
  })
})
