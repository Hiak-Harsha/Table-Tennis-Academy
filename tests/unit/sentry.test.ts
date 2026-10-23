import { describe, it, expect, vi, beforeEach } from 'vitest'
import { captureException, captureMessage } from '@/lib/sentry'
import { logger } from '@/lib/logger'

describe('Sentry Error Monitoring Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to logger.error when SENTRY_DSN is not set', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const error = new Error('Test application crash')

    captureException(error, { userId: 'usr-1', action: 'PAY_FEE' })

    expect(loggerSpy).toHaveBeenCalledWith(
      'Test application crash',
      error,
      expect.objectContaining({
        userId: 'usr-1',
        action: 'PAY_FEE',
      })
    )
  })

  it('converts non-Error throws into Error instances', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    captureException('String error message', { requestId: 'req-999' })

    expect(loggerSpy).toHaveBeenCalledWith(
      'String error message',
      expect.any(Error),
      expect.objectContaining({
        requestId: 'req-999',
      })
    )
  })

  it('captures messages with appropriate log levels', () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    captureMessage('Informational notice', 'info')
    expect(infoSpy).toHaveBeenCalledWith('Informational notice', undefined)

    captureMessage('Warning notice', 'warning')
    expect(warnSpy).toHaveBeenCalledWith('Warning notice', undefined)

    captureMessage('Error notice', 'error')
    expect(errorSpy).toHaveBeenCalledWith('Error notice', undefined, undefined)
  })
})
