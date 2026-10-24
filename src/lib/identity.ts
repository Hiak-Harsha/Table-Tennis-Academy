import { normalizePhone, isValidPhone } from './phone'

export type IdentifierType = 'STUDENT_ID' | 'PHONE' | 'ADMIN_HANDLE' | 'UNKNOWN'

export interface ResolvedIdentifier {
  type: IdentifierType
  value: string
  original: string
}

const STUDENT_ID_REGEX = /^TTA-\d+$/i
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolves any login input into a canonical identity:
 * 1. TTA-XXXXX format (e.g. TTA-0892, tta-01001) -> Student ID
 * 2. 10-digit mobile, +91, 0-prefixed, spaced -> E.164 (+91XXXXXXXXXX)
 * 3. Alphanumeric handle (e.g. 'admin') or UUID -> Admin handle / Login ID
 */
export function resolveLoginIdentifier(rawInput: string): ResolvedIdentifier {
  const trimmed = (rawInput || '').trim()

  if (!trimmed) {
    return {
      type: 'UNKNOWN',
      value: '',
      original: rawInput,
    }
  }

  // 1. Check for Student ID (case-insensitive TTA-XXXXX)
  if (STUDENT_ID_REGEX.test(trimmed)) {
    return {
      type: 'STUDENT_ID',
      value: trimmed.toUpperCase(),
      original: rawInput,
    }
  }

  // 2. Check if valid Indian phone number in any formatting (spaces, dashes, +91, 0 prefix, raw 10 digits)
  if (isValidPhone(trimmed)) {
    try {
      const e164 = normalizePhone(trimmed)
      return {
        type: 'PHONE',
        value: e164,
        original: rawInput,
      }
    } catch {
      // Fall through if normalize throws unexpectedly
    }
  }

  // 3. Check for UUID or alphanumeric admin handle (e.g. 'admin')
  if (UUID_REGEX.test(trimmed) || /^[a-zA-Z0-9_.-]{3,50}$/.test(trimmed)) {
    return {
      type: 'ADMIN_HANDLE',
      value: trimmed.toLowerCase(),
      original: rawInput,
    }
  }

  return {
    type: 'UNKNOWN',
    value: trimmed,
    original: rawInput,
  }
}
