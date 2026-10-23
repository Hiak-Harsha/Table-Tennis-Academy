import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, redact } from '@/lib/logger'

describe('Logger Utility & Secret Redaction', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('redact function', () => {
    it('redacts sensitive keys including password, token, secret, and otp', () => {
      const input = {
        username: 'player1',
        password: 'SuperSecretPassword123!',
        token: 'jwt.token.here',
        otp: '123456',
        razorpay_webhook_secret: 'whsec_9999',
        publicInfo: 'safe',
      }

      const result = redact(input) as Record<string, unknown>
      expect(result.username).toBe('player1')
      expect(result.publicInfo).toBe('safe')
      expect(result.password).toBe('[REDACTED]')
      expect(result.token).toBe('[REDACTED]')
      expect(result.otp).toBe('[REDACTED]')
      expect(result.razorpay_webhook_secret).toBe('[REDACTED]')
    })

    it('redacts nested objects and arrays recursively', () => {
      const input = {
        meta: {
          sessionSecret: 'super-secret',
          user: {
            apiKey: 'key_123',
            name: 'Coach',
          },
        },
        items: [{ token: 'abc' }, { note: 'regular note' }],
      }

      const result = redact(input) as Record<string, any>
      expect(result.meta.sessionSecret).toBe('[REDACTED]')
      expect(result.meta.user.apiKey).toBe('[REDACTED]')
      expect(result.meta.user.name).toBe('Coach')
      expect(result.items[0].token).toBe('[REDACTED]')
      expect(result.items[1].note).toBe('regular note')
    })
  })

  describe('Logger class methods', () => {
    it('creates child logger inheriting parent context', () => {
      const parent = new Logger({ requestId: 'req-123' })
      const child = parent.child({ userId: 'user-456' })

      child.error('Child test error', new Error('Something broke'))
      expect(consoleErrorSpy).toHaveBeenCalled()
      const callArgs = consoleErrorSpy.mock.calls[0]
      const stringified = JSON.stringify(callArgs)
      expect(stringified).toContain('req-123')
      expect(stringified).toContain('user-456')
    })

    it('logs errors with error details', () => {
      const logger = new Logger()
      const testErr = new Error('Database unreachable')
      logger.error('Failed DB query', testErr, { query: 'SELECT 1' })

      expect(consoleErrorSpy).toHaveBeenCalled()
      const callArgs = consoleErrorSpy.mock.calls[0]
      const stringified = JSON.stringify(callArgs)
      expect(stringified).toContain('Failed DB query')
    })
  })
})
