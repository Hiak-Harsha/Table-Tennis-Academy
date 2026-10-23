import { z } from 'zod'

export const StudentEnrollmentStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'GRADUATED',
])

export type StudentEnrollmentStatus = z.infer<typeof StudentEnrollmentStatusEnum>

export const VALID_STUDENT_STATUS_TRANSITIONS: Record<
  StudentEnrollmentStatus,
  StudentEnrollmentStatus[]
> = {
  ACTIVE: ['INACTIVE', 'SUSPENDED', 'GRADUATED'],
  INACTIVE: ['ACTIVE', 'SUSPENDED', 'GRADUATED'],
  SUSPENDED: ['ACTIVE', 'INACTIVE'],
  GRADUATED: ['ACTIVE'], // Re-enrollment
}

/**
 * Validates whether a state transition is legal according to academy enrollment lifecycle rules.
 */
export function isValidStudentStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } {
  const currentParsed = StudentEnrollmentStatusEnum.safeParse(currentStatus)
  const newParsed = StudentEnrollmentStatusEnum.safeParse(newStatus)

  if (!currentParsed.success) {
    return { valid: false, reason: `Invalid current status: ${currentStatus}` }
  }

  if (!newParsed.success) {
    return { valid: false, reason: `Invalid target status: ${newStatus}` }
  }

  if (currentParsed.data === newParsed.data) {
    return { valid: false, reason: `Status is already ${newParsed.data}` }
  }

  const allowed = VALID_STUDENT_STATUS_TRANSITIONS[currentParsed.data]
  if (!allowed.includes(newParsed.data)) {
    return {
      valid: false,
      reason: `Illegal transition from ${currentParsed.data} to ${newParsed.data}`,
    }
  }

  return { valid: true }
}
