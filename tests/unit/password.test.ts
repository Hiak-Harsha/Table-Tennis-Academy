import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isBcryptHash,
} from '@/lib/password'

describe('Password Security and Hashing', { timeout: 30000 }, () => {
  it('should validate password strength correctly', () => {
    expect(validatePasswordStrength('').valid).toBe(false)
    expect(validatePasswordStrength('short').valid).toBe(false)
    expect(validatePasswordStrength('1234567').valid).toBe(false)
    expect(validatePasswordStrength('12345678').valid).toBe(true)
    expect(validatePasswordStrength('strongPassword123!').valid).toBe(true)
  })

  it('should hash password with bcrypt cost 12', async () => {
    const plain = 'SecurePassword123'
    const hash = await hashPassword(plain)

    expect(isBcryptHash(hash)).toBe(true)
    expect(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$')).toBe(true)
    expect(hash).not.toBe(plain)
  })

  it('should verify correct bcrypt password and reject invalid', async () => {
    const plain = 'MySecretPassphrase99'
    const hash = await hashPassword(plain)

    const matchValid = await verifyPassword(plain, hash)
    expect(matchValid.matches).toBe(true)
    expect(matchValid.needsRehash).toBe(false)

    const matchWrong = await verifyPassword('WrongPassword', hash)
    expect(matchWrong.matches).toBe(false)
  })

  it('should transparently verify legacy plaintext passwords and flag for upgrade', async () => {
    const legacyPlain = 'legacy_plaintext_pw'

    const check = await verifyPassword(legacyPlain, legacyPlain)
    expect(check.matches).toBe(true)
    expect(check.needsRehash).toBe(true)

    const checkFail = await verifyPassword('different_pw', legacyPlain)
    expect(checkFail.matches).toBe(false)
  })

  it('should reject passwords shorter than 8 characters during hashing', async () => {
    await expect(hashPassword('short')).rejects.toThrow(/at least 8 characters/i)
  })
})
