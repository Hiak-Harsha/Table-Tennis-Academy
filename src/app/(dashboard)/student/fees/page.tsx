import { getCurrentUser as getSession } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { FeePaymentClient } from '@/components/FeePaymentClient'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { processFeeRecords } from '@/lib/fee-status'

export default async function StudentFees() {
  const payload = await getSession()
  if (!payload || payload.role !== 'STUDENT') {
    return <div style={{ padding: '2rem', fontSize: '0.85rem' }}>Access Denied. Please Login.</div>
  }

  // Fetch all fees for this student
  const rawFees = await prisma.academyFee.findMany({
    where: { studentId: payload.studentId },
    orderBy: { dueDate: 'asc' },
  })

  // Compute server-side statuses and financial totals
  const summary = processFeeRecords(rawFees)
  const nextPayable = summary.nextPayableFee

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Academy Fees & Subscriptions</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
          Real-time account balance, dues schedule, and payment history.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.25rem' }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary / Next Due Card */}
          <section
            className="card glass"
            style={{
              background: summary.overdueCount > 0
                ? 'linear-gradient(145deg, #1f0d0d, #0d1929)'
                : 'linear-gradient(145deg, #0f172a, #0d1929)',
              border: summary.overdueCount > 0 ? '1px solid rgba(239,68,68,0.3)' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                {summary.overdueCount > 0 ? (
                  <span
                    className="animate-pulse-subtle"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: '#f87171',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '1rem',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Action Required: {summary.overdueCount} Overdue
                  </span>
                ) : nextPayable ? (
                  <span
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                      color: '#60a5fa',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '1rem',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    {nextPayable.statusLabel}
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10b981',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '1rem',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    ✓ All Fees Paid
                  </span>
                )}
                <h2 style={{ fontSize: '1.2rem', margin: '0.5rem 0 0.15rem 0', fontWeight: 800 }}>
                  {nextPayable ? 'Pay Next Due' : 'Account Settled'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>
                  {nextPayable ? `${nextPayable.interval || 'MONTHLY'} Billing Subscription` : 'No outstanding dues.'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.15rem' }}>
                  {nextPayable?.isOverdue ? 'Overdue Since' : 'Due Date'}
                </p>
                <p style={{ fontWeight: 800, fontSize: '0.9rem', margin: 0, color: nextPayable?.isOverdue ? '#f87171' : '#f8fafc' }}>
                  {nextPayable ? formatDate(nextPayable.dueDate, 'short') : 'Current'}
                </p>
              </div>
            </div>

            {/* Financial Overview Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                gap: '0.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Next Payable
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>
                  {formatINR(nextPayable ? nextPayable.amount : 0)}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Outstanding
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: summary.totalOutstandingPaise > 0 ? '#f87171' : '#10b981',
                  }}
                >
                  {formatINR(summary.totalOutstandingPaise)}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Settled
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                  {formatINR(summary.totalPaidPaise)}
                </div>
              </div>
            </div>

            {nextPayable ? (
              <FeePaymentClient
                feeId={nextPayable.id}
                amount={nextPayable.amount}
                currentStatus={nextPayable.computedStatus}
              />
            ) : (
              <p style={{ textAlign: 'center', color: '#10b981', fontSize: '0.8rem', margin: 0, fontWeight: 700 }}>
                ✓ All subscriptions are fully up to date. Thank you!
              </p>
            )}
          </section>

          {/* Complete Prioritized Fees List (Overdue -> Due -> Upcoming -> Paid) */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '0.9rem', fontWeight: 800 }}>
                All Academy Invoices ({summary.fees.length})
              </h3>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Times rendered in Asia/Kolkata (IST)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                  padding: '0.5rem 0.75rem',
                  color: '#64748b',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span>Due Date</span>
                <span>Interval</span>
                <span style={{ textAlign: 'center' }}>Amount</span>
                <span style={{ textAlign: 'right' }}>Status</span>
              </div>

              {summary.fees.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.8rem' }}>
                  No fee records found for this account.
                </p>
              ) : (
                summary.fees.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                      padding: '0.65rem 0.75rem',
                      background: f.isOverdue
                        ? 'rgba(239,68,68,0.05)'
                        : f.computedStatus === 'DUE'
                        ? 'rgba(59,130,246,0.05)'
                        : 'rgba(255,255,255,0.02)',
                      borderLeft: f.isOverdue
                        ? '3px solid #ef4444'
                        : f.computedStatus === 'DUE'
                        ? '3px solid #3b82f6'
                        : f.computedStatus === 'PAID'
                        ? '3px solid #10b981'
                        : '3px solid #64748b',
                      borderRadius: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatDate(f.dueDate, 'short')}</span>
                      {f.paymentDate && (
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          Paid {formatDate(f.paymentDate, 'short')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                      {f.interval || 'MONTHLY'}
                    </span>
                    <span style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      {formatINR(f.amount)}
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        color:
                          f.computedStatus === 'PAID'
                            ? '#10b981'
                            : f.computedStatus === 'OVERDUE'
                            ? '#ef4444'
                            : f.computedStatus === 'DUE'
                            ? '#3b82f6'
                            : '#94a3b8',
                      }}
                    >
                      {f.statusLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar: Access Status */}
        <div>
          <section className="card" style={{ textAlign: 'center', position: 'sticky', top: '1rem' }}>
            <h4
              style={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                letterSpacing: '0.08em',
                fontWeight: 800,
              }}
            >
              Academy Identity Pass
            </h4>
            <div
              style={{
                background: '#fff',
                padding: '0.75rem',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '0.75rem',
                opacity: summary.isCompliant ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                }}
              >
                QR: {payload.displayId}
              </div>
            </div>
            <div
              style={{
                color: summary.isCompliant ? '#10b981' : '#f87171',
                fontWeight: 800,
                fontSize: '0.85rem',
                marginBottom: '0.25rem',
              }}
            >
              {summary.isCompliant ? '✓ AUTHORIZED ENTRY' : '⚠ ACCESS RESTRICTED'}
            </div>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
              Athlete ID: <strong>{payload.displayId}</strong>
              <br />
              Status: {summary.isCompliant ? 'In Good Standing' : `${summary.overdueCount} Overdue Fee(s)`}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
