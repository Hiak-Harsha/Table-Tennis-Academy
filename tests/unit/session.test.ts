import { describe, it, expect } from 'vitest'
import {
  signSessionToken,
  verifySessionToken,
  hashToken,
  SessionPayload,
} from '@/lib/session'
import { SignJWT } from 'jose'

describe('Session Cryptographic Tokens', () => {
  const samplePayload: SessionPayload = {
    sub: 'user-uuid-1234',
    role: 'STUDENT',
    sid: 'session-uuid-5678',
    studentId: 'TTA-1001',
    internalStudentId: 'student-uuid-9999',
  }

  it('should sign and verify valid session tokens', async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    const token = await signSessionToken(samplePayload, expiresAt)

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // Valid JWT structure

    const decoded = await verifySessionToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe(samplePayload.sub)
    expect(decoded?.role).toBe(samplePayload.role)
    expect(decoded?.sid).toBe(samplePayload.sid)
    expect(decoded?.studentId).toBe(samplePayload.studentId)
    expect(decoded?.internalStudentId).toBe(samplePayload.internalStudentId)
  })

  it('should reject forged tokens signed with an arbitrary secret', async () => {
    const fakeSecret = new TextEncoder().encode('an_attacker_controlled_secret_key_12345')
    const forgedToken = await new SignJWT({
      role: 'ADMIN',
      sid: 'attacker-session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('attacker-admin-id')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(fakeSecret)

    const result = await verifySessionToken(forgedToken)
    expect(result).toBeNull()
  })

  it('should reject tampered tokens', async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const token = await signSessionToken(samplePayload, expiresAt)

    const parts = token.split('.')
    // Modify the payload part
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'user-uuid-1234', role: 'ADMIN', sid: 'tampered' })
    ).toString('base64url')

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`

    const result = await verifySessionToken(tamperedToken)
    expect(result).toBeNull()
  })

  it('should reject expired tokens', async () => {
    const expiredAt = new Date(Date.now() - 1000) // 1 second in the past
    const token = await signSessionToken(samplePayload, expiredAt)

    const result = await verifySessionToken(token)
    expect(result).toBeNull()
  })

  it('should generate deterministic sha256 hashes for tokens', () => {
    const token = 'sample.jwt.token'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // 256 bits = 64 hex chars
    expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true)
  })
})
