import prisma from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/auth-guard'
import { FeeStatusControl, AddFeeModal } from '@/components/FeeControls'
import ExportFeesButton from '@/components/ExportFeesButton'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { computeFeeStatus } from '@/lib/fee-status'

export const dynamic = 'force-dynamic'

export default async function AdminFeesPage() {
  await requireRoleOrRedirect(['ADMIN'])
  const fees = await prisma.academyFee.findMany({
    include: { student: true },
    orderBy: { dueDate: 'desc' },
  })
  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })

  // Authoritative server-side status computation for each fee record
  const enrichedFees = fees.map((f) => {
    const computed = computeFeeStatus(f)
    return {
      ...f,
      computedStatus: computed,
    }
  })

  const totalPaid = enrichedFees
    .filter((f) => f.computedStatus === 'PAID')
    .reduce((s, f) => s + f.amount, 0)
  const totalDue = enrichedFees
    .filter((f) => f.computedStatus === 'OVERDUE' || f.computedStatus === 'DUE')
    .reduce((s, f) => s + f.amount, 0)
  const overdueCount = enrichedFees.filter((f) => f.computedStatus === 'OVERDUE').length

  const feeExportData = enrichedFees.map((f) => ({
    dueDate: f.dueDate,
    interval: f.interval || 'MONTHLY',
    studentId: f.student.studentId,
    fullName: f.student.fullName,
    amount: f.amount,
    status: f.status,
    paymentDate: f.paymentDate,
  }))

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem' }}>Fee Ledger</h1>
          <p style={{ color: 'hsl(var(--text-secondary))', margin: 0, fontSize: '0.75rem' }}>Manage all student fee records.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ExportFeesButton fees={feeExportData} />
          <AddFeeModal students={students} />
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Collected', value: formatINR(totalPaid), color: '#10b981' },
          { label: 'Outstanding (Due/Overdue)', value: formatINR(totalDue), color: '#ef4444' },
          { label: 'Overdue Count', value: overdueCount, color: '#fb923c' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ borderTop: `3px solid ${m.color}` }}>
            <p style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.35rem' }}>{m.label}</p>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Due Date', 'Interval', 'Student ID', 'Name', 'Amount', 'Status', 'Paid On'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', color: '#64748b', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrichedFees.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No records. Click &quot;+ Add Fee Record&quot;.</td></tr>
              ) : enrichedFees.map(row => (
                <tr key={row.id} className="roster-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.55rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {formatDate(row.dueDate, 'medium')}
                  </td>
                  <td style={{ padding: '0.55rem 0.75rem', color: '#64748b', fontWeight: 700, fontSize: '0.6rem' }}>{row.interval || 'MONTHLY'}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.student.studentId}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#e2e8f0', fontSize: '0.8rem' }}>{row.student.fullName}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, fontSize: '0.85rem' }}>{formatINR(row.amount)}</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}><FeeStatusControl feeId={row.id} status={row.status} /></td>
                  <td style={{ padding: '0.55rem 0.75rem', color: '#475569', fontSize: '0.7rem' }}>{row.paymentDate ? formatDate(row.paymentDate, 'short') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
