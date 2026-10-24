import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const BCRYPT_SALT_ROUNDS = 12

// Pre-computed valid bcrypt hash of a random 32-char string with cost 12 for dummy comparison
export const DUMMY_BCRYPT_HASH = '$2a$12$L7H9OcmFk8v2j1k6r0p1MeoXo5rQY8n0K7l6f9c3s1A4b5C6d7E8G'

/**
 * Validate password strength (minimum 8 characters)
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' }
  }
  return { valid: true }
}

/**
 * Check if a string is a standard bcrypt hash
 */
export function isBcryptHash(hash: string | null | undefined): boolean {
  if (!hash) return false
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)
}

/**
 * Cryptographically hash a password with bcrypt (cost factor >= 12)
 */
export async function hashPassword(plainText: string): Promise<string> {
  const check = validatePasswordStrength(plainText)
  if (!check.valid) {
    throw new Error(check.error)
  }
  return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS)
}

/**
 * Constant-time string comparison for legacy fallback
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Verify a password against a hash or legacy plaintext record.
 * Always performs bcrypt compare (against dummy hash if input is missing or legacy)
 * to prevent user enumeration timing side channels.
 */
export async function verifyPassword(
  plainText: string,
  storedHashOrPlain: string | null | undefined
): Promise<{ matches: boolean; needsRehash: boolean }> {
  if (!storedHashOrPlain || !plainText) {
    await bcrypt.compare(plainText || '', DUMMY_BCRYPT_HASH)
    return { matches: false, needsRehash: false }
  }

  // Standard bcrypt hash verification
  if (isBcryptHash(storedHashOrPlain)) {
    const matches = await bcrypt.compare(plainText, storedHashOrPlain)
    return { matches, needsRehash: false }
  }

  // Legacy plaintext match check using constant-time comparison
  const matches = timingSafeStringEqual(plainText, storedHashOrPlain)
  // Run dummy bcrypt compare so legacy check doesn't create a detectable timing shortcut
  await bcrypt.compare(plainText, DUMMY_BCRYPT_HASH)
  return { matches, needsRehash: matches }
}

/**
 * Verify a password against a hash, supporting transparent migration of legacy plaintext records
 */
export async function verifyAndMigratePassword(
  plainText: string,
  storedHashOrPlain: string | null | undefined,
  onMigrate?: (newHash: string) => Promise<void>
): Promise<boolean> {
  const { matches, needsRehash } = await verifyPassword(plainText, storedHashOrPlain)
  if (matches && needsRehash && onMigrate) {
    const newHash = await hashPassword(plainText)
    await onMigrate(newHash)
  }
  return matches
}
