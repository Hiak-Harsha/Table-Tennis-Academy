/**
 * Production-Ready Structured Logger for TTA Portal
 * 
 * Outputs single-line JSON in production for log aggregators (Datadog, CloudWatch, Loki)
 * and formatted messages in development.
 * Automatically redacts sensitive fields (passwords, tokens, OTPs, session cookies).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '')
  return (
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('otp') ||
    normalized.includes('cookie') ||
    normalized.includes('auth') ||
    normalized.includes('apikey')
  )
}

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated: Max Depth]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1))
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      result[key] = redact(val, depth + 1)
    } else {
      result[key] = val
    }
  }
  return result
}

export interface LogPayload {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  context?: Record<string, unknown>
  error?: {
    name?: string
    message?: string
    stack?: string
  }
}

export class Logger {
  private minLevel: number
  private defaultContext: Record<string, unknown>

  constructor(context: Record<string, unknown> = {}) {
    const isTest = process.env.NODE_ENV === 'test'
    const isDev = process.env.NODE_ENV === 'development'
    
    // Default level: warn in test, debug in dev, info in production
    const defaultLevel: LogLevel = isTest ? 'warn' : isDev ? 'debug' : 'info'
    this.minLevel = LOG_LEVEL_PRIORITY[defaultLevel]
    this.defaultContext = context
  }

  public child(extraContext: Record<string, unknown>): Logger {
    return new Logger({ ...this.defaultContext, ...extraContext })
  }

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    err?: Error | unknown
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevel) return

    const isProd = process.env.NODE_ENV === 'production'
    const combinedContext = { ...this.defaultContext, ...context }
    const cleanContext = redact(combinedContext) as Record<string, unknown>

    let errorObj: LogPayload['error'] | undefined
    if (err instanceof Error) {
      errorObj = {
        name: err.name,
        message: err.message,
        stack: isProd ? err.stack : undefined,
      }
    } else if (err && typeof err === 'object') {
      errorObj = redact(err) as LogPayload['error']
    }

    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'tta-portal',
      environment: process.env.NODE_ENV || 'development',
      ...(Object.keys(cleanContext).length > 0 ? { context: cleanContext } : {}),
      ...(errorObj ? { error: errorObj } : {}),
    }

    if (isProd) {
      const output = JSON.stringify(payload)
      if (level === 'error') {
        console.error(output)
      } else if (level === 'warn') {
        console.warn(output)
      } else {
        console.log(output)
      }
    } else {
      const prefix = `[${payload.timestamp}] [${level.toUpperCase()}]`
      const ctxStr = Object.keys(cleanContext).length ? JSON.stringify(cleanContext) : ''
      if (level === 'error') {
        console.error(`${prefix} ${message}`, ctxStr, err ?? '')
      } else if (level === 'warn') {
        console.warn(`${prefix} ${message}`, ctxStr)
      } else {
        console.log(`${prefix} ${message}`, ctxStr)
      }
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context)
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context)
  }

  public warn(message: string, context?: Record<string, unknown>, err?: Error | unknown): void {
    this.write('warn', message, context, err)
  }

  public error(message: string, err?: Error | unknown, context?: Record<string, unknown>): void {
    this.write('error', message, context, err)
  }
}

export const logger = new Logger()
export { redact }
