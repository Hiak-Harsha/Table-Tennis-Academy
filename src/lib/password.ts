import bcrypt from 'bcryptjs'

const BCRYPT_SALT_ROUNDS = 12

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
 * Verify a password against a hash or legacy plaintext record
 */
export async function verifyPassword(
  plainText: string,
  storedHashOrPlain: string | null | undefined
): Promise<{ matches: boolean; needsRehash: boolean }> {
  if (!storedHashOrPlain || !plainText) return { matches: false, needsRehash: false }

  // If already a bcrypt hash, perform standard bcrypt compare
  if (isBcryptHash(storedHashOrPlain)) {
    const matches = await bcrypt.compare(plainText, storedHashOrPlain)
    return { matches, needsRehash: false }
  }

  // Legacy plaintext match check
  const matches = plainText === storedHashOrPlain
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
