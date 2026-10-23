import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeOptionalText,
} from '@/lib/sanitize'

describe('Input Sanitization & XSS Prevention', () => {
  it('should escape HTML special characters to prevent inline script execution', () => {
    const raw = '<script>alert("xss")</script>'
    const escaped = escapeHtml(raw)
    expect(escaped).not.toContain('<script>')
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
  })

  it('should strip script, iframe, and other tags completely using stripHtml', () => {
    const dirty = 'Hello <script>alert(1)</script><b>World</b> <iframe src="evil.com"></iframe>'
    const clean = stripHtml(dirty)
    expect(clean).toBe('Hello World')
    expect(clean).not.toContain('<script>')
    expect(clean).not.toContain('<iframe>')
  })

  it('should strip non-printable ASCII control characters', () => {
    const dirty = 'Hello\u0000\u0007World'
    const clean = stripHtml(dirty)
    expect(clean).toBe('HelloWorld')
  })

  it('should sanitize user text by stripping tags and escaping characters', () => {
    const input = '   <img src=x onerror=alert(1)> Rallies & Matches   '
    const sanitized = sanitizeText(input)
    expect(sanitized).toBe('Rallies &amp; Matches')
    expect(sanitized).not.toContain('onerror')
  })

  it('should handle sanitizeOptionalText cleanly', () => {
    expect(sanitizeOptionalText(null)).toBeNull()
    expect(sanitizeOptionalText('')).toBeNull()
    expect(sanitizeOptionalText('   ')).toBeNull()
    expect(sanitizeOptionalText('Valid Coach Notes')).toBe('Valid Coach Notes')
    expect(sanitizeOptionalText('Notes with <script>hack</script>')).toBe('Notes with')
  })
})
