import { isFutureDate } from './date'

export interface TournamentDetails {
  id: string
  name: string
  date: Date | string
  venue: string
  level: string
  entryFee: number // in Paise
  eligibilityCriteria?: string | null
  maxPlayers?: number | null
  registrationDeadline?: Date | string | null
  currentParticipantsCount?: number
}

export interface StudentEligibilityProfile {
  id: string
  studentId: string
  fullName: string
  age: number
  batchType: string // BEGINNER, INTERMEDIATE, ADVANCED
  enrollmentStatus: string
}

export interface EligibilityResult {
  eligible: boolean
  reason?: string
}

/**
 * Checks whether a tournament is still open for new registrations.
 */
export function checkTournamentRegistrationWindow(
  tournament: Pick<TournamentDetails, 'date' | 'registrationDeadline'>,
  referenceDate: Date = new Date()
): EligibilityResult {
  // 1. Tournament date must be in the future
  if (!isFutureDate(tournament.date, referenceDate)) {
    return { eligible: false, reason: 'This tournament has already started or concluded.' }
  }

  // 2. Registration deadline check
  if (tournament.registrationDeadline) {
    if (!isFutureDate(tournament.registrationDeadline, referenceDate)) {
      return { eligible: false, reason: 'Registration deadline for this tournament has passed.' }
    }
  }

  return { eligible: true }
}

/**
 * Checks if tournament capacity is full.
 */
export function checkTournamentCapacity(
  maxPlayers: number | null | undefined,
  currentCount: number
): EligibilityResult {
  if (typeof maxPlayers === 'number' && maxPlayers > 0) {
    if (currentCount >= maxPlayers) {
      return { eligible: false, reason: `Tournament is at maximum capacity (${maxPlayers} players).` }
    }
  }
  return { eligible: true }
}

/**
 * Validates a student's eligibility criteria against a tournament's requirements.
 */
export function checkStudentTournamentEligibility(
  student: StudentEligibilityProfile,
  tournament: TournamentDetails
): EligibilityResult {
  // 1. Student must be actively enrolled
  if (student.enrollmentStatus !== 'ACTIVE') {
    return {
      eligible: false,
      reason: `Only actively enrolled students may register (current status: ${student.enrollmentStatus}).`,
    }
  }

  const criteria = (tournament.eligibilityCriteria || '').toUpperCase()
  const studentBatch = student.batchType.toUpperCase()
  const tournamentLevel = tournament.level.toUpperCase()

  // 2. Strict batch-specific tournament restrictions
  if (criteria.includes('BEGINNER ONLY') && studentBatch !== 'BEGINNER') {
    return { eligible: false, reason: 'Tournament is strictly restricted to Beginner batch athletes.' }
  }
  if (criteria.includes('INTERMEDIATE ONLY') && studentBatch !== 'INTERMEDIATE') {
    return { eligible: false, reason: 'Tournament is strictly restricted to Intermediate batch athletes.' }
  }
  if (criteria.includes('ADVANCED ONLY') && studentBatch !== 'ADVANCED') {
    return { eligible: false, reason: 'Tournament is strictly restricted to Advanced batch athletes.' }
  }

  // Level mismatch checks
  if (tournamentLevel === 'ADVANCED' && studentBatch === 'BEGINNER') {
    return {
      eligible: false,
      reason: 'Athletes in the Beginner batch are not eligible for Advanced tier tournaments.',
    }
  }

  // 3. Age limit checks (e.g. "U-15", "UNDER 15", "U-18", "UNDER 18")
  const underAgeMatch = criteria.match(/(?:U[- ]?|UNDER\s+)(\d{1,2})/i)
  if (underAgeMatch) {
    const maxAge = parseInt(underAgeMatch[1], 10)
    if (student.age > maxAge) {
      return {
        eligible: false,
        reason: `Athlete age (${student.age}) exceeds the tournament age limit (${maxAge} years).`,
      }
    }
  }

  return { eligible: true }
}
