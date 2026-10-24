import { describe, it, expect } from 'vitest'
import {
  generateNumericOtp,
  hashOtpCode,
  verifyOtpCode,
  generateVerificationToken,
  verifyVerificationToken,
} from '@/lib/otp'

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

  it('should generate and verify single-use signed verification token', () => {
    const phone = '+919876543210'
    const challengeId = 'test-challenge-uuid'
    const token = generateVerificationToken(phone, 'REGISTER', challengeId)

    const verification = verifyVerificationToken(token, phone, 'REGISTER')
    expect(verification.valid).toBe(true)
    expect(verification.challengeId).toBe(challengeId)
  })

  it('should reject verification token with wrong phone or purpose', () => {
    const phone = '+919876543210'
    const token = generateVerificationToken(phone, 'REGISTER', 'uuid')

    const wrongPhone = verifyVerificationToken(token, '+919876543211', 'REGISTER')
    expect(wrongPhone.valid).toBe(false)
    expect(wrongPhone.error).toContain('does not match this phone number')

    const wrongPurpose = verifyVerificationToken(token, phone, 'PASSWORD_RESET')
    expect(wrongPurpose.valid).toBe(false)
    expect(wrongPurpose.error).toContain('not valid for this action')
  })

  it('should reject tampered verification token', () => {
    const token = generateVerificationToken('+919876543210', 'REGISTER', 'uuid')
    const tampered = token.slice(0, -4) + 'abcd'

    const res = verifyVerificationToken(tampered, '+919876543210', 'REGISTER')
    expect(res.valid).toBe(false)
  })
})
