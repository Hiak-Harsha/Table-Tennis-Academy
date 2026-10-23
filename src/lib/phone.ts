/**
 * Phone number normalization utilities for Indian mobile numbers.
 * Normalizes all inputs into E.164 format: +91XXXXXXXXXX
 */

/**
 * Normalizes input to E.164 (+91 followed by 10 digits starting with 6-9).
 * Handles raw 10-digit ('9876543210'), with country code ('+919876543210'),
 * with spaces/dashes ('+91 98765-43210'), or leading zero ('09876543210').
 */
export function normalizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Phone number must be a valid string')
  }

  // Strip all non-digit characters except leading plus
  const cleaned = input.trim().replace(/[\s\-_()]/g, '')

  let digits = cleaned
  if (digits.startsWith('+91')) {
    digits = digits.slice(3)
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1)
  }

  // Must be exactly 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new Error('Invalid mobile number: must be a 10-digit Indian number starting with 6-9')
  }

  return `+91${digits}`
}

/**
 * Validates whether the given string is a valid Indian mobile number.
 */
export function isValidPhone(input: string): boolean {
  try {
    normalizePhone(input)
    return true
  } catch {
    return false
  }
}

/**
 * Formats E.164 number (+919876543210) into display format (+91 98765 43210).
 */
export function formatPhoneDisplay(e164: string): string {
  try {
    const normalized = normalizePhone(e164)
    const tenDigits = normalized.slice(3)
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`
  } catch {
    return e164
  }
}
