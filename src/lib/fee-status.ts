import { compareKolkataDates } from './date'

export type ComputedFeeStatus = 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING'

export interface FeeRecord {
  id: string
  studentId: string
  amount: number // in Paise
  dueDate: Date | string
  status: string // raw DB status: PAID, DUE, OVERDUE
  interval?: string | null
  paymentDate?: Date | string | null
  receiptUrl?: string | null
  method?: string | null
}

export interface ClassifiedFee extends FeeRecord {
  computedStatus: ComputedFeeStatus
  statusLabel: string
  isOverdue: boolean
  isPayable: boolean
}

export interface FeeSummary {
  fees: ClassifiedFee[]
  totalOutstandingPaise: number
  totalOverduePaise: number
  totalDuePaise: number
  totalPaidPaise: number
  nextPayableFee: ClassifiedFee | null
  overdueCount: number
  isCompliant: boolean
}

/**
 * Computes authoritative status for an academy fee record relative to referenceDate (default now).
 */
export function computeFeeStatus(fee: FeeRecord, referenceDate: Date = new Date()): ComputedFeeStatus {
  // If already marked PAID in DB, authoritative status is PAID
  if (fee.status === 'PAID') {
    return 'PAID'
  }

  const comparison = compareKolkataDates(fee.dueDate, referenceDate)

  if (comparison < 0) {
    // Due date was in a past calendar day in Asia/Kolkata
    return 'OVERDUE'
  } else if (comparison === 0) {
    // Due date is today in Asia/Kolkata
    return 'DUE'
  } else {
    // Due date is in the future
    return 'UPCOMING'
  }
}

/**
 * Classifies, enriches, and sorts all student fees into prioritized financial order:
 * OVERDUE (oldest first) -> DUE (oldest first) -> UPCOMING (earliest first) -> PAID (newest first).
 */
export function processFeeRecords(fees: FeeRecord[], referenceDate: Date = new Date()): FeeSummary {
  const classified: ClassifiedFee[] = fees.map((fee) => {
    const computedStatus = computeFeeStatus(fee, referenceDate)
    let statusLabel = 'Paid'
    if (computedStatus === 'OVERDUE') statusLabel = 'Overdue'
    else if (computedStatus === 'DUE') statusLabel = 'Due Today'
    else if (computedStatus === 'UPCOMING') statusLabel = 'Upcoming'

    return {
      ...fee,
      computedStatus,
      statusLabel,
      isOverdue: computedStatus === 'OVERDUE',
      isPayable: computedStatus !== 'PAID',
    }
  })

  // Priority ranking for sorting:
  // 1: OVERDUE (most urgent)
  // 2: DUE
  // 3: UPCOMING
  // 4: PAID
  const priorityMap: Record<ComputedFeeStatus, number> = {
    OVERDUE: 1,
    DUE: 2,
    UPCOMING: 3,
    PAID: 4,
  }

  classified.sort((a, b) => {
    const pA = priorityMap[a.computedStatus]
    const pB = priorityMap[b.computedStatus]

    if (pA !== pB) return pA - pB

    const timeA = new Date(a.dueDate).getTime()
    const timeB = new Date(b.dueDate).getTime()

    // For unpaid fees, sort ascending (oldest due date first)
    if (a.computedStatus !== 'PAID') {
      return timeA - timeB
    }

    // For paid fees, sort descending (most recently paid/due first)
    return timeB - timeA
  })

  let totalOverduePaise = 0
  let totalDuePaise = 0
  let totalPaidPaise = 0

  for (const f of classified) {
    if (f.computedStatus === 'OVERDUE') {
      totalOverduePaise += f.amount
    } else if (f.computedStatus === 'DUE') {
      totalDuePaise += f.amount
    } else if (f.computedStatus === 'PAID') {
      totalPaidPaise += f.amount
    }
  }

  const overdueCount = classified.filter((f) => f.computedStatus === 'OVERDUE').length
  const nextPayableFee = classified.find((f) => f.isPayable) || null

  return {
    fees: classified,
    totalOutstandingPaise: totalOverduePaise + totalDuePaise,
    totalOverduePaise,
    totalDuePaise,
    totalPaidPaise,
    nextPayableFee,
    overdueCount,
    isCompliant: overdueCount === 0,
  }
}
