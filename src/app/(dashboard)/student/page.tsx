import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import Link from 'next/link'

export default async function StudentDashboard() {
  const session = await getSession()

  if (!session || session.role !== 'STUDENT') {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Session Expired</h2>
        <Link href="/login" className="btn btn-primary">Login</Link>
      </div>
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    include: {
      fees: { orderBy: { dueDate: 'desc' }, take: 1 },
      tournaments: { include: { tournament: true }, orderBy: { tournament: { date: 'desc' } }, take: 1 }
    }
  })

  if (!student) return <div style={{ padding: '3rem', textAlign: 'center', fontSize: '0.85rem' }}>Identity resolution failed. Please contact Academy Command.</div>

  const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 3 })
  const alerts = await prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 4 })

  const latestFee = student.fees[0]
  const nextTournament = student.tournaments[0]?.tournament

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Compact Hero */}
      <div style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        marginBottom: '1.25rem', display: 'flex', alignItems: 'center',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-subtle)',
        background: 'hsla(var(--bg-card), 0.5)', minHeight: '120px'
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/images/student_hero.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, hsl(var(--bg-primary)) 20%, transparent 80%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.7rem', background: 'hsl(var(--accent-red-glow))', border: '1px solid hsl(var(--accent-red))', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--accent-red))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Active
          </div>
          <h1 style={{ fontSize: '1.5rem' }}>Welcome, {student.fullName.split(' ')[0]}!</h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', margin: 0 }}>
            Review your circuit status and manage your profile.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div className="card glass" style={{ borderLeft: `4px solid ${latestFee?.status === 'PAID' ? '#10b981' : 'hsl(var(--accent-red))'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fees</span>
                <span style={{ background: latestFee?.status === 'PAID' ? 'rgba(16,185,129,0.1)' : 'hsl(var(--accent-red-glow))', color: latestFee?.status === 'PAID' ? '#10b981' : 'hsl(var(--accent-red))', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{latestFee?.status || 'NONE'}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>₹{latestFee?.amount.toLocaleString('en-IN') || '0'}</div>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0 }}>Payment nexus active</p>
            </div>

            <div className="card glass" style={{ borderLeft: '4px solid hsl(var(--accent-blue))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next Event</span>
                <span style={{ fontSize: '0.85rem' }}>🏆</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.3rem', lineHeight: 1.3 }}>{nextTournament?.name || 'No Entries'}</div>
              <Link href="/student/tournaments" style={{ color: 'hsl(var(--accent-blue))', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>View Events →</Link>
            </div>
          </div>

          {/* CTA Card */}
          <div className="card glass" style={{ background: 'linear-gradient(135deg, hsla(220, 33%, 12%, 0.8), hsla(220, 33%, 5%, 0.8))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.3rem' }}>Athlete Circle</h3>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Meet other players in the {student.batchType} tier and discuss strategies.
                </p>
                <Link href="/student/connect" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  Access Hub
                </Link>
              </div>
              <div style={{ fontSize: '2.5rem', opacity: 0.08, flexShrink: 0 }}>🤝</div>
            </div>
          </div>

          {/* Broadcasts */}
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📣</span> Broadcasts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {broadcasts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', margin: 0 }}>No announcements.</p>
                </div>
              ) : broadcasts.map((b: any) => (
                <div key={b.id} className="glass" style={{ padding: '0.75rem', borderLeft: b.category === 'URGENT' ? '3px solid hsl(var(--accent-red))' : '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{
                      background: b.category === 'URGENT' ? 'hsl(var(--accent-red-glow))' : 'hsl(var(--accent-blue-glow))',
                      color: b.category === 'URGENT' ? 'hsl(var(--accent-red))' : 'hsl(var(--accent-blue))',
                      padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase'
                    }}>{b.category}</span>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>{b.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', margin: 0 }}>{b.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Profile Card */}
          <div className="card glass" style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>
            <div style={{
              width: '44px', height: '44px', background: 'linear-gradient(135deg, hsl(var(--accent-red)), #881337)',
              borderRadius: '12px', display: 'grid', placeItems: 'center', fontSize: '1.3rem',
              margin: '0 auto 0.75rem auto', transform: 'rotate(-3deg)'
            }}>🏓</div>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>{student.fullName}</h3>
            <code style={{ fontSize: '0.65rem', color: 'hsl(var(--accent-blue))', background: 'hsl(var(--accent-blue-glow))', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{student.studentId}</code>

            <div style={{ marginTop: '0.75rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              {[
                ['Batch', student.batchType],
                ['Mentor', student.coachName || 'Unassigned'],
                ['Status', 'ACTIVE']
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: label === 'Status' ? '#10b981' : 'inherit' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <h4 style={{ fontSize: '0.65rem', marginBottom: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alerts</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {alerts.length === 0 ? (
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontStyle: 'italic' }}>No alerts.</p>
              ) : alerts.map((a: any) => (
                <div key={a.id} className="glass" style={{ padding: '0.5rem 0.65rem', borderLeft: '2px solid hsl(var(--accent-blue))', borderRadius: '6px', fontSize: '0.7rem' }}>
                  <p style={{ margin: 0, lineHeight: 1.4, color: '#e2e8f0' }}>{a.message}</p>
                  <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem', display: 'block' }}>{new Date(a.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
