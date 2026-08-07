import { getSession } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { FeePaymentClient } from '@/components/FeePaymentClient'

export default async function StudentFees() {
  const payload = await getSession()
  if (!payload || payload.role !== 'STUDENT') {
    return <div style={{ padding: '2rem', fontSize: '0.85rem' }}>Access Denied. Please Login.</div>
  }

  const fees = await prisma.academyFee.findMany({
    where: { studentId: payload.studentId }, orderBy: { dueDate: 'desc' }
  })

  const mostRecent = fees[0]

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.2rem' }}>Financial Portal</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Manage subscriptions and payment history.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.25rem' }}>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Current Dues */}
          <section className="card glass" style={{ background: 'linear-gradient(145deg, #0f172a, #0d1929)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                {!mostRecent || mostRecent.status !== 'PAID' ? (
                  <span className="animate-pulse-subtle" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>Action Required</span>
                ) : (
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>Active</span>
                )}
                <h2 style={{ fontSize: '1.1rem', margin: '0.5rem 0 0.15rem 0' }}>Current Dues</h2>
                <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>{mostRecent?.interval || 'MONTHLY'} Billing</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.15rem' }}>Due Date</p>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{mostRecent ? new Date(mostRecent.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.1rem' }}>Total Payable</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{mostRecent?.amount.toLocaleString('en-IN') || '0'}</div>
              </div>
              <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.1rem' }}>Status</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: mostRecent?.status === 'PAID' ? '#10b981' : '#f87171' }}>{mostRecent?.status || 'PENDING'}</div>
              </div>
            </div>

            {(!mostRecent || mostRecent.status !== 'PAID') && (
              <FeePaymentClient feeId={mostRecent?.id || ''} amount={mostRecent?.amount || 0} currentStatus={mostRecent?.status || 'DUE'} />
            )}
            {mostRecent?.status === 'PAID' && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Payment secured. ✓</p>
            )}
          </section>

          {/* History */}
          <section className="card">
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', fontSize: '0.85rem' }}>Payment History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.5rem 0.65rem', color: '#64748b', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Date</span><span>Interval</span><span style={{ textAlign: 'center' }}>Amount</span><span style={{ textAlign: 'right' }}>Status</span>
              </div>
              {fees.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.75rem' }}>No records.</p>
              ) : fees.map((f: any) => (
                <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.55rem 0.65rem', background: 'rgba(255,255,255,0.015)', borderRadius: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem' }}>{new Date(f.dueDate).toLocaleDateString('en-IN')}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{f.interval || 'MONTHLY'}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>₹{f.amount}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: f.status === 'PAID' ? '#10b981' : '#f87171', fontSize: '0.7rem' }}>{f.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: ID Pass */}
        <div>
          <section className="card" style={{ textAlign: 'center', position: 'sticky', top: '1rem' }}>
            <h4 style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.08em' }}>Identity Pass</h4>
            <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '0.75rem', opacity: mostRecent?.status === 'PAID' ? 1 : 0.35 }}>
              <img src="/images/qr_placeholder.png" alt="QR" style={{ width: '120px', height: '120px', filter: mostRecent?.status === 'PAID' ? 'none' : 'grayscale(1)' }} />
            </div>
            <div style={{ color: mostRecent?.status === 'PAID' ? '#10b981' : '#f87171', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              {mostRecent?.status === 'PAID' ? '✓ AUTHORIZED' : '⚠ REVOKED'}
            </div>
            <p style={{ fontSize: '0.65rem', color: '#475569', margin: 0 }}>
              ID: <strong>{payload.displayId}</strong><br />
              Valid: {mostRecent ? new Date(mostRecent.dueDate).toLocaleDateString() : 'N/A'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
