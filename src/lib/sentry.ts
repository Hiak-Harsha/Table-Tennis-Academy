/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Sentry & Error Monitoring Integration
 * 
 * Provides centralized error capture with context enrichment.
 * Falls back gracefully to structured logger when SENTRY_DSN is not configured.
 */

import { logger } from './logger'

export interface ErrorContext {
  userId?: string
  role?: string
  requestId?: string
  action?: string
  extra?: Record<string, unknown>
}

interface SentryScope {
  setUser: (user: { id?: string; role?: string }) => void
  setTag: (key: string, value: string) => void
  setExtras: (extras: Record<string, unknown>) => void
}

export function captureException(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error))

  // If SENTRY_DSN is set and Sentry is available at runtime:
  if (process.env.SENTRY_DSN) {
    try {
      // Dynamic import to avoid hard dependency failure if not installed
      const Sentry = require('@sentry/nextjs')
      Sentry.withScope((scope: SentryScope) => {
        if (context?.userId) {
          scope.setUser({ id: context.userId, role: context.role })
        }
        if (context?.requestId) {
          scope.setTag('requestId', context.requestId)
        }
        if (context?.action) {
          scope.setTag('action', context.action)
        }
        if (context?.extra) {
          scope.setExtras(context.extra)
        }
        Sentry.captureException(err)
      })
      return
    } catch {
      // Sentry package not bundled or initialization skipped, continue to logger
    }
  }

  // Graceful fallback to structured logger
  logger.error(err.message, err, {
    userId: context?.userId,
    role: context?.role,
    requestId: context?.requestId,
    action: context?.action,
    ...context?.extra,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/nextjs')
      Sentry.captureMessage(message, level)
      return
    } catch {
      // Fallback
    }
  }

  const logContext = context ? { ...context } : undefined
  if (level === 'error') {
    logger.error(message, undefined, logContext)
  } else if (level === 'warning') {
    logger.warn(message, logContext)
  } else {
    logger.info(message, logContext)
  }
}
