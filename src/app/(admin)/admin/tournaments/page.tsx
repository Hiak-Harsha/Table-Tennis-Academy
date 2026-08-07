import prisma from '@/lib/prisma'
import CreateTournamentModal from '@/components/CreateTournamentModal'

export default async function AdminTournaments() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: 'asc' }, include: { participants: true }
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
          {tournaments.map((t: any) => (
            <div key={t.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: 'hsl(var(--accent-blue))', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>{t.level}</span>
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>{t.participants.length} Reg</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{t.name}</h3>
                <div style={{ display: 'flex', gap: '1rem', color: 'hsl(var(--text-secondary))', fontSize: '0.75rem' }}>
                  <span>📅 {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>📍 {t.venue}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>₹{t.entryFee}</div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.65rem' }}>Entry Fee</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
