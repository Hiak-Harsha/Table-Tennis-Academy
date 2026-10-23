import { describe, it, expect } from 'vitest'
import {
  computeFeeStatus,
  processFeeRecords,
  FeeRecord,
} from '@/lib/fee-status'

describe('Fee Status Engine & Financial Classification', () => {
  // Reference date: 2026-10-24 12:00:00 IST (UTC: 2026-10-24 06:30:00)
  const referenceDate = new Date('2026-10-24T06:30:00Z')

  describe('computeFeeStatus', () => {
    it('returns PAID if status is already PAID regardless of due date', () => {
      const fee: FeeRecord = {
        id: 'f-1',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-10-01T00:00:00Z',
        status: 'PAID',
      }
      expect(computeFeeStatus(fee, referenceDate)).toBe('PAID')
    })

    it('classifies unpaid fee as OVERDUE if dueDate is before today in IST', () => {
      const fee: FeeRecord = {
        id: 'f-2',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-10-23T00:00:00Z', // Yesterday
        status: 'DUE',
      }
      expect(computeFeeStatus(fee, referenceDate)).toBe('OVERDUE')
    })

    it('classifies unpaid fee as DUE if dueDate is today in IST', () => {
      const fee: FeeRecord = {
        id: 'f-3',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-10-24T00:00:00Z', // Today
        status: 'DUE',
      }
      expect(computeFeeStatus(fee, referenceDate)).toBe('DUE')
    })

    it('classifies unpaid fee as UPCOMING if dueDate is in the future in IST', () => {
      const fee: FeeRecord = {
        id: 'f-4',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-11-01T00:00:00Z', // Next month
        status: 'DUE',
      }
      expect(computeFeeStatus(fee, referenceDate)).toBe('UPCOMING')
    })
  })

  describe('processFeeRecords', () => {
    const sampleFees: FeeRecord[] = [
      {
        id: 'fee-paid',
        studentId: 's-1',
        amount: 200000,
        dueDate: '2026-09-01T00:00:00Z',
        status: 'PAID',
        paymentDate: '2026-09-02T10:00:00Z',
      },
      {
        id: 'fee-upcoming',
        studentId: 's-1',
        amount: 300000,
        dueDate: '2026-11-05T00:00:00Z',
        status: 'DUE',
      },
      {
        id: 'fee-overdue-old',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-08-01T00:00:00Z',
        status: 'DUE',
      },
      {
        id: 'fee-due-today',
        studentId: 's-1',
        amount: 250000,
        dueDate: '2026-10-24T00:00:00Z',
        status: 'DUE',
      },
      {
        id: 'fee-overdue-recent',
        studentId: 's-1',
        amount: 150000,
        dueDate: '2026-10-15T00:00:00Z',
        status: 'DUE',
      },
    ]

    it('sorts in strict priority order: OVERDUE (oldest first) -> DUE -> UPCOMING -> PAID', () => {
      const summary = processFeeRecords(sampleFees, referenceDate)
      const ids = summary.fees.map((f) => f.id)

      expect(ids).toEqual([
        'fee-overdue-old', // Aug 1 (Overdue)
        'fee-overdue-recent', // Oct 15 (Overdue)
        'fee-due-today', // Oct 24 (Due today)
        'fee-upcoming', // Nov 5 (Upcoming)
        'fee-paid', // Paid
      ])
    })

    it('computes financial totals accurately in paise without floating point error', () => {
      const summary = processFeeRecords(sampleFees, referenceDate)

      // Overdue: 250000 + 150000 = 400000
      expect(summary.totalOverduePaise).toBe(400000)
      // Due today: 250000
      expect(summary.totalDuePaise).toBe(250000)
      // Total outstanding: 400000 + 250000 = 650000
      expect(summary.totalOutstandingPaise).toBe(650000)
      // Paid: 200000
      expect(summary.totalPaidPaise).toBe(200000)
    })

    it('identifies the most urgent nextPayableFee and marks compliance status', () => {
      const summary = processFeeRecords(sampleFees, referenceDate)

      // Oldest overdue fee should be the next payable fee
      expect(summary.nextPayableFee?.id).toBe('fee-overdue-old')
      expect(summary.overdueCount).toBe(2)
      expect(summary.isCompliant).toBe(false)
    })

    it('marks account compliant when zero overdue fees exist', () => {
      const compliantFees: FeeRecord[] = [
        {
          id: 'fee-due-today',
          studentId: 's-1',
          amount: 250000,
          dueDate: '2026-10-24T00:00:00Z',
          status: 'DUE',
        },
        {
          id: 'fee-paid',
          studentId: 's-1',
          amount: 200000,
          dueDate: '2026-09-01T00:00:00Z',
          status: 'PAID',
        },
      ]

      const summary = processFeeRecords(compliantFees, referenceDate)
      expect(summary.overdueCount).toBe(0)
      expect(summary.isCompliant).toBe(true)
      expect(summary.nextPayableFee?.id).toBe('fee-due-today')
    })
  })
})
