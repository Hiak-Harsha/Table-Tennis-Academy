import prisma from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/auth-guard'
import CreateTournamentModal from '@/components/CreateTournamentModal'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

export default async function AdminTournaments() {
  await requireRoleOrRedirect(['ADMIN'])
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: 'asc' },
    include: { participants: true },
  })

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem' }}>Tournament Management</h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', margin: 0 }}>Create and manage competitive events.</p>
        </div>
        <CreateTournamentModal />
      </div>

      {tournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.7 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
          <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>No Tournaments</h3>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem' }}>Click &quot;+ Create Tournament&quot; to start.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tournaments.map((t) => (
            <div key={t.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: 'hsl(var(--accent-blue))', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>{t.level}</span>
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                    {t.maxPlayers ? `${t.participants.length} / ${t.maxPlayers} Spots` : `${t.participants.length} Reg`}
                  </span>
                  {t.registrationDeadline && (
                    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                      Deadline: {formatDate(t.registrationDeadline, 'short')}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{t.name}</h3>
                <div style={{ display: 'flex', gap: '1rem', color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                  <span>📅 {formatDate(t.date, 'medium')}</span>
                  <span>📍 {t.venue}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{formatINR(t.entryFee)}</div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.65rem' }}>Entry Fee</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
