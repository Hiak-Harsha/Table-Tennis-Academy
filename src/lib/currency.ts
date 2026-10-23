/**
 * TTA Currency Utility Module
 * All monetary amounts in the database are stored as integers in the lowest currency unit (Paise: 1 INR = 100 Paise)
 * to avoid IEEE 754 floating-point rounding errors.
 */

/**
 * Converts an amount in Rupees (e.g. 1500 or 1500.50) to integer Paise (e.g. 150000 or 150050).
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees.trim()) : rupees
  if (isNaN(num) || !isFinite(num)) {
    throw new TypeError(`Invalid currency amount: "${rupees}" is not a valid number.`)
  }
  if (num < 0) {
    throw new RangeError(`Currency amounts cannot be negative. Received: ${num}`)
  }
  // Math.round avoids IEEE 754 precision issues like 19.99 * 100 = 1998.9999999999998
  return Math.round(num * 100)
}

/**
 * Converts an integer amount in Paise (e.g. 150000) to Rupees (e.g. 1500).
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) {
    throw new TypeError(`Invalid paise amount: "${paise}" is not a valid number.`)
  }
  return paise / 100
}

/**
 * Formats integer Paise into a localized Indian Rupee currency string (e.g. ₹1,500 or ₹1,500.50).
 */
export function formatINR(
  paise: number | null | undefined,
  options?: { showZeroPaise?: boolean }
): string {
  if (paise == null || isNaN(paise)) return '₹0'

  const rupees = paiseToRupees(paise)
  const hasSubRupee = paise % 100 !== 0
  const showFraction = options?.showZeroPaise || hasSubRupee

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/**
 * Formats a plain Rupee amount into a localized Indian Rupee string.
 */
export function formatRupees(rupees: number | null | undefined): string {
  if (rupees == null || isNaN(rupees)) return '₹0'
  return formatINR(rupeesToPaise(rupees))
}
