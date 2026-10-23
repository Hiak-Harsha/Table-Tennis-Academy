import { describe, it, expect } from 'vitest'
import {
  checkTournamentRegistrationWindow,
  checkTournamentCapacity,
  checkStudentTournamentEligibility,
  TournamentDetails,
  StudentEligibilityProfile,
} from '@/lib/tournament-eligibility'

describe('Tournament Registration Eligibility & Capacity Rules', () => {
  const referenceDate = new Date('2026-10-24T10:00:00Z')

  describe('checkTournamentRegistrationWindow', () => {
    it('accepts tournaments scheduled in the future with open deadline', () => {
      const res = checkTournamentRegistrationWindow(
        {
          date: '2026-11-15T09:00:00Z',
          registrationDeadline: '2026-11-10T23:59:59Z',
        },
        referenceDate
      )
      expect(res.eligible).toBe(true)
    })

    it('rejects tournaments whose start date has passed', () => {
      const res = checkTournamentRegistrationWindow(
        {
          date: '2026-10-20T09:00:00Z',
        },
        referenceDate
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('already started')
    })

    it('rejects tournaments whose registration deadline has expired', () => {
      const res = checkTournamentRegistrationWindow(
        {
          date: '2026-11-15T09:00:00Z',
          registrationDeadline: '2026-10-23T23:59:59Z', // Expired yesterday
        },
        referenceDate
      )
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('Registration deadline')
    })
  })

  describe('checkTournamentCapacity', () => {
    it('allows entry when current participants are below maxPlayers', () => {
      expect(checkTournamentCapacity(32, 20).eligible).toBe(true)
      expect(checkTournamentCapacity(null, 150).eligible).toBe(true) // Unlimited capacity
    })

    it('rejects entry when tournament has reached maximum capacity', () => {
      const res = checkTournamentCapacity(32, 32)
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('maximum capacity (32 players)')
    })
  })

  describe('checkStudentTournamentEligibility', () => {
    const baseTournament: TournamentDetails = {
      id: 'tour-101',
      name: 'Autumn State Championship',
      date: '2026-11-20T09:00:00Z',
      venue: 'Main Arena',
      level: 'INTERMEDIATE',
      entryFee: 150000,
      eligibilityCriteria: 'Intermediate batch athletes, Under 18 years',
    }

    const eligibleStudent: StudentEligibilityProfile = {
      id: 'std-1',
      studentId: 'TTA-01001',
      fullName: 'Aarav Patel',
      age: 16,
      batchType: 'INTERMEDIATE',
      enrollmentStatus: 'ACTIVE',
    }

    it('approves an active student matching level and age restrictions', () => {
      const res = checkStudentTournamentEligibility(eligibleStudent, baseTournament)
      expect(res.eligible).toBe(true)
    })

    it('rejects students whose enrollment status is not ACTIVE', () => {
      const inactiveStudent = { ...eligibleStudent, enrollmentStatus: 'SUSPENDED' }
      const res = checkStudentTournamentEligibility(inactiveStudent, baseTournament)
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('actively enrolled')
    })

    it('rejects beginner students from advanced tier events', () => {
      const beginnerStudent = { ...eligibleStudent, batchType: 'BEGINNER' }
      const advancedTournament: TournamentDetails = {
        ...baseTournament,
        level: 'ADVANCED',
        eligibilityCriteria: 'Elite athletes only',
      }
      const res = checkStudentTournamentEligibility(beginnerStudent, advancedTournament)
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('Beginner batch are not eligible')
    })

    it('enforces specific batch-only restrictions', () => {
      const beginnerOnlyTour: TournamentDetails = {
        ...baseTournament,
        level: 'BEGINNER',
        eligibilityCriteria: 'BEGINNER ONLY',
      }
      const intermediateStudent = { ...eligibleStudent, batchType: 'INTERMEDIATE' }
      const res = checkStudentTournamentEligibility(intermediateStudent, beginnerOnlyTour)
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('restricted to Beginner batch')
    })

    it('rejects students exceeding age limits (e.g. U-15 tournament vs 16-year-old student)', () => {
      const under15Tour: TournamentDetails = {
        ...baseTournament,
        eligibilityCriteria: 'Under 15 Junior Championship',
      }
      const res = checkStudentTournamentEligibility(eligibleStudent, under15Tour) // Student is 16
      expect(res.eligible).toBe(false)
      expect(res.reason).toContain('exceeds the tournament age limit (15 years)')
    })
  })
})
