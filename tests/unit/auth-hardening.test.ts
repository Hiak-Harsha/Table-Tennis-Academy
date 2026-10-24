import { describe, it, expect } from 'vitest'
import { resolveLoginIdentifier } from '@/lib/identity'
import { generateVerificationToken, verifyVerificationToken } from '@/lib/otp'
import { DUMMY_BCRYPT_HASH, isBcryptHash } from '@/lib/password'

describe('Phase A: Authentication Security Hardening', () => {
  describe('Canonical Identity Resolution', () => {
    it('resolves 10-digit, +91, 0-prefixed, and spaced phone numbers to identical E.164 identity', () => {
      const inputs = [
        '9876543210',
        '+919876543210',
        '98765 43210',
        '09876543210',
        '+91 98765-43210',
        ' 9876543210 ',
      ]

      for (const input of inputs) {
        const resolved = resolveLoginIdentifier(input)
        expect(resolved.type).toBe('PHONE')
        expect(resolved.value).toBe('+919876543210')
      }
    })

    it('resolves Student IDs consistently to uppercase TTA-XXXXX', () => {
      const inputs = ['tta-01001', 'TTA-01001', ' tta-0892 ']
      expect(resolveLoginIdentifier(inputs[0])).toEqual({
        type: 'STUDENT_ID',
        value: 'TTA-01001',
        original: inputs[0],
      })
      expect(resolveLoginIdentifier(inputs[1])).toEqual({
        type: 'STUDENT_ID',
        value: 'TTA-01001',
        original: inputs[1],
      })
      expect(resolveLoginIdentifier(inputs[2])).toEqual({
        type: 'STUDENT_ID',
        value: 'TTA-0892',
        original: inputs[2],
      })
    })

    it('resolves Admin handles and UUIDs to ADMIN_HANDLE', () => {
      expect(resolveLoginIdentifier('admin')).toEqual({
        type: 'ADMIN_HANDLE',
        value: 'admin',
        original: 'admin',
      })
    })
  })

  describe('User Enumeration Timing Side-Channel Protection', () => {
    it('provides a valid pre-computed cost-12 bcrypt dummy hash', () => {
      expect(isBcryptHash(DUMMY_BCRYPT_HASH)).toBe(true)
      expect(DUMMY_BCRYPT_HASH.startsWith('$2a$12$') || DUMMY_BCRYPT_HASH.startsWith('$2b$12$')).toBe(true)
    })
  })

  describe('Cryptographically Bound OTP Verification Tokens', () => {
    it('creates single-use signed verification tokens binding phone and purpose', () => {
      const phone = '+919876543210'
      const token = generateVerificationToken(phone, 'REGISTER', 'challenge-123')

      // Token format: base64url.signature
      expect(token).toContain('.')
      const [payloadB64] = token.split('.')
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

      expect(payload.phone).toBe(phone)
      expect(payload.purpose).toBe('REGISTER')
      expect(payload.challengeId).toBe('challenge-123')

      // Validation succeeds with correct parameters
      const valid = verifyVerificationToken(token, phone, 'REGISTER')
      expect(valid.valid).toBe(true)
      expect(valid.challengeId).toBe('challenge-123')
    })

    it('rejects verification tokens presented for wrong purpose or wrong phone number', () => {
      const token = generateVerificationToken('+919876543210', 'REGISTER', 'challenge-123')

      const wrongPhone = verifyVerificationToken(token, '+919999999999', 'REGISTER')
      expect(wrongPhone.valid).toBe(false)
      expect(wrongPhone.error).toContain('does not match this phone number')

      const wrongPurpose = verifyVerificationToken(token, '+919876543210', 'PASSWORD_RESET')
      expect(wrongPurpose.valid).toBe(false)
      expect(wrongPurpose.error).toContain('not valid for this action')
    })

    it('rejects tampered or forged verification tokens', () => {
      const token = generateVerificationToken('+919876543210', 'REGISTER', 'challenge-123')
      const tampered = token + 'tampered'
      expect(verifyVerificationToken(tampered, '+919876543210', 'REGISTER').valid).toBe(false)
    })
  })
})
