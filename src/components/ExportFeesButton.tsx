'use client'

import { exportToCsv } from '@/lib/csv-export'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'

interface FeeExportItem {
  dueDate: string | Date
  interval: string
  studentId: string
  fullName: string
  amount: number
  status: string
  paymentDate?: string | Date | null
}

export default function ExportFeesButton({ fees }: { fees: FeeExportItem[] }) {
  const handleExport = () => {
    const headers = ['Due Date', 'Interval', 'Student ID', 'Player Name', 'Amount (INR)', 'Status', 'Paid On']
    const rows = fees.map(f => [
      formatDate(f.dueDate, 'short'),
      f.interval || 'MONTHLY',
      f.studentId,
      f.fullName,
      formatINR(f.amount),
      f.status,
      f.paymentDate ? formatDate(f.paymentDate, 'short') : '—',
    ])
    exportToCsv('academy_fee_ledger', headers, rows)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="btn btn-secondary"
      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
    >
      <span>📥</span> Export CSV
    </button>
  )
}
