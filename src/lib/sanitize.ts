/**
 * Input sanitization and XSS protection helpers
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/**
 * Escapes HTML special characters to prevent Cross-Site Scripting (XSS)
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char)
}

/**
 * Strips HTML tags, script blocks, event handlers, and malicious control characters
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove <style> tags
    .replace(/<[^>]+>/g, '')                                          // Remove any other HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')  // Remove non-printable control chars
    .replace(/\s+/g, ' ')                                             // Collapse multiple spaces
    .trim()
}

/**
 * Sanitizes user-generated string input:
 * 1. Strips dangerous tags
 * 2. Normalizes unicode whitespace
 * 3. Escapes special HTML characters
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ''
  const cleaned = stripHtml(input)
  return escapeHtml(cleaned)
}

/**
 * Sanitizes an optional string, returning null if empty or null
 */
export function sanitizeOptionalText(input: string | null | undefined): string | null {
  if (!input) return null
  const sanitized = sanitizeText(input)
  return sanitized.length > 0 ? sanitized : null
}
