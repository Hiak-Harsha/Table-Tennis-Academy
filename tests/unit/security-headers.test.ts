import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

describe('Next.js Security Headers & Hardening Config', () => {
  it('disables X-Powered-By header to prevent fingerprinting', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('configures production security headers function', async () => {
    expect(nextConfig.headers).toBeDefined()
    if (typeof nextConfig.headers !== 'function') {
      throw new Error('headers must be a function')
    }

    const headerConfigs = await nextConfig.headers()
    expect(Array.isArray(headerConfigs)).toBe(true)

    const globalHeaders = headerConfigs.find((cfg) => cfg.source === '/:path*')
    expect(globalHeaders).toBeDefined()

    const headersMap = new Map<string, string>()
    for (const h of globalHeaders!.headers) {
      headersMap.set(h.key.toLowerCase(), h.value)
    }

    // Verify HSTS
    expect(headersMap.get('strict-transport-security')).toContain('max-age=63072000')
    expect(headersMap.get('strict-transport-security')).toContain('includeSubDomains')

    // Verify Frame & Sniffing protections
    expect(headersMap.get('x-frame-options')).toBe('DENY')
    expect(headersMap.get('x-content-type-options')).toBe('nosniff')
    expect(headersMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin')

    // Verify Permissions Policy
    expect(headersMap.get('permissions-policy')).toContain('camera=()')
    expect(headersMap.get('permissions-policy')).toContain('microphone=()')

    // Verify CSP directives
    const csp = headersMap.get('content-security-policy')
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('restricts allowed origins for server actions', () => {
    const allowed = nextConfig.experimental?.serverActions?.allowedOrigins
    expect(Array.isArray(allowed)).toBe(true)
    expect(allowed).toContain('localhost:3000')
  })
})
