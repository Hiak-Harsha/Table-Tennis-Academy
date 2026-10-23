/**
 * Authoritative Date & Timezone utilities for TTA Portal.
 * Standardizes all date representations to UTC in storage and Asia/Kolkata (IST) in rendering.
 */

export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Formats a Date or ISO string into a human-readable string in Asia/Kolkata timezone.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  format: 'short' | 'medium' | 'long' | 'datetime' | 'dateOnly' = 'medium'
): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid Date'

  switch (format) {
    case 'short':
      // e.g. 24 Oct
      return d.toLocaleDateString('en-IN', {
        timeZone: IST_TIMEZONE,
        day: 'numeric',
        month: 'short',
      })
    case 'medium':
      // e.g. 24 Oct 2026
      return d.toLocaleDateString('en-IN', {
        timeZone: IST_TIMEZONE,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    case 'long':
      // e.g. Saturday, 24 October 2026
      return d.toLocaleDateString('en-IN', {
        timeZone: IST_TIMEZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    case 'datetime':
      // e.g. 24 Oct 2026, 02:30 PM
      return d.toLocaleString('en-IN', {
        timeZone: IST_TIMEZONE,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    case 'dateOnly':
      // YYYY-MM-DD in Asia/Kolkata
      return d.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE })
    default:
      return d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE })
  }
}

/**
 * Returns the calendar date string (YYYY-MM-DD) in Asia/Kolkata.
 */
export function getKolkataDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE })
}

/**
 * Compares two dates using date-only semantics in Asia/Kolkata timezone.
 * Returns:
 *  -1 if dateA < dateB (dateA is earlier in calendar day than dateB)
 *   0 if dateA === dateB (same calendar day in Kolkata)
 *   1 if dateA > dateB (dateA is later in calendar day than dateB)
 */
export function compareKolkataDates(dateA: Date | string, dateB: Date | string): number {
  const da = typeof dateA === 'string' ? new Date(dateA) : dateA
  const db = typeof dateB === 'string' ? new Date(dateB) : dateB

  const strA = getKolkataDateString(da)
  const strB = getKolkataDateString(db)

  if (strA < strB) return -1
  if (strA > strB) return 1
  return 0
}

/**
 * Checks whether a given timestamp is in the future in Asia/Kolkata.
 */
export function isFutureDate(date: Date | string, referenceDate: Date = new Date()): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getTime() > referenceDate.getTime()
}
