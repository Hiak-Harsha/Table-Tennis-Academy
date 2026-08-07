import prisma from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminDashboard() {
  const studentCount = await prisma.student.count()
  const totalRevenue = await prisma.academyFee.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } })
  const pendingPayments = await prisma.academyFee.count({ where: { status: { not: 'PAID' } } })
  const recentStudents = await prisma.student.findMany({ orderBy: { id: 'desc' }, take: 6 })
  const upcomingTournaments = await prisma.tournament.findMany({ orderBy: { date: 'asc' }, take: 3 })

  const revenueAmount = totalRevenue._sum.amount || 0

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Compact Hero */}
      <div style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        marginBottom: '1.25rem', display: 'flex', alignItems: 'center',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-subtle)',
        background: 'hsla(var(--bg-card), 0.5)', minHeight: '110px'
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/images/admin_hero.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, hsl(var(--bg-primary)) 15%, transparent 85%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="animate-pulse-subtle" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Online</span>
          </div>
          <h1 style={{ fontSize: '1.5rem' }}>Academy Operations</h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', margin: 0 }}>
            Real-time telemetry of athlete performance and operations.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Active Roster', value: studentCount, icon: '👥', color: 'hsl(var(--accent-blue))', sub: 'Registered athletes' },
          { label: 'Revenue', value: `₹${revenueAmount.toLocaleString('en-IN')}`, icon: '💰', color: '#10b981', sub: 'Collected payments' },
          { label: 'Pending', value: pendingPayments, icon: '⚠️', color: '#f59e0b', sub: 'Outstanding dues' },
        ].map((m, i) => (
          <div key={i} className="card glass" style={{ borderTop: `3px solid ${m.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.15rem' }}>{m.value}</div>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>

        {/* Left: Recent Students */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>👤</span> Recent Athletes
            </h3>
            <Link href="/admin/students" style={{ color: 'hsl(var(--accent-blue))', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {recentStudents.map((s: any) => (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem',
                alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.015)', border: '1px solid transparent', transition: '0.15s'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.fullName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{s.studentId}</div>
                </div>
                <span style={{
                  background: s.batchType === 'ADVANCED' ? 'rgba(239,68,68,0.1)' : s.batchType === 'INTERMEDIATE' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                  color: s.batchType === 'ADVANCED' ? '#ef4444' : s.batchType === 'INTERMEDIATE' ? '#f59e0b' : '#3b82f6',
                  padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase'
                }}>{s.batchType}</span>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: s.enrollmentStatus === 'ACTIVE' ? '#10b981' : '#64748b'
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Quick Actions */}
          <div className="card" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.65rem', marginBottom: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { href: '/admin/students', label: 'Manage Roster', icon: '📋' },
                { href: '/admin/fees', label: 'Fee Ledger', icon: '💳' },
                { href: '/admin/tournaments', label: 'Create Event', icon: '🏆' },
                { href: '/admin/chat', label: 'Batch Chat', icon: '💬' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.5rem 0.65rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                  textDecoration: 'none', color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 500,
                  transition: '0.15s'
                }}>
                  <span style={{ fontSize: '0.85rem' }}>{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Tournaments */}
          <div className="card">
            <h4 style={{ fontSize: '0.65rem', marginBottom: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Upcoming Events</h4>
            {upcomingTournaments.length === 0 ? (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontStyle: 'italic' }}>No scheduled events.</p>
            ) : upcomingTournaments.map((t: any) => (
              <div key={t.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                  {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {t.venue}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
