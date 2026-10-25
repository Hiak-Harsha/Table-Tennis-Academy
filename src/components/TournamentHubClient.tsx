'use client'

import { useState } from 'react'
import RegisterTournamentButton from '@/components/RegisterTournamentButton'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'

export interface TournamentItem {
  id: string
  name: string
  date: Date | string
  venue: string
  level: string
  entryFee: number
  eligibilityCriteria?: string | null
  maxPlayers?: number | null
  registrationDeadline?: Date | string | null
  _count?: { participants: number }
}

export interface MyRegistrationItem {
  id: string
  tournamentId: string
  paymentStatus: string
  amountPaid: number
}

export default function TournamentHubClient({ 
  tournaments, 
  myRegistrations, 
  studentId 
}: { 
  tournaments: TournamentItem[] 
  myRegistrations: MyRegistrationItem[] 
  studentId: string 
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING')

  const registeredIds = new Set(myRegistrations.map((r) => r.tournamentId))
  
  const filtered = tournaments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.venue.toLowerCase().includes(search.toLowerCase())
    const isPast = new Date(t.date) < new Date()
    
    if (tab === 'UPCOMING') return matchesSearch && !isPast
    if (tab === 'HISTORY') return matchesSearch && (isPast || registeredIds.has(t.id))
    return false
  })

  const sorted = [...filtered].sort((a, b) => {
    if (tab === 'UPCOMING') return new Date(a.date).getTime() - new Date(b.date).getTime()
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="animate-fade-in">
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search championships, opens, or venues..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: 'rgba(255,255,255,0.04)', 
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', color: '#fff', outline: 'none', transition: '0.2s'
            }}
          />
        </div>

        <div style={{ display: 'flex', background: 'hsl(var(--bg-card))', borderRadius: 'var(--radius-lg)', padding: '0.4rem', border: '1px solid var(--border-subtle)' }}>
          {(['UPCOMING', 'HISTORY'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              style={{ 
                padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', 
                background: tab === t ? 'hsl(var(--accent-blue))' : 'transparent', 
                color: tab === t ? '#fff' : 'hsl(var(--text-muted))', fontWeight: 800, cursor: 'pointer', transition: '0.3s' 
              }}
            >
              {t === 'UPCOMING' ? 'Upcoming Opens' : 'Past Events'}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '6rem 2rem', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.5rem', color: 'hsl(var(--text-primary))' }}>No Tournaments Found</h2>
          <p style={{ color: 'hsl(var(--text-muted))', maxWidth: '400px', margin: '0 auto' }}>Try refining your search or check back later for new circuit announcements.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {sorted.map(t => {
            const alreadyRegistered = registeredIds.has(t.id)
            const isPast = new Date(t.date) < new Date()
            const participantCount = t._count?.participants ?? 0
            const isFull = typeof t.maxPlayers === 'number' && t.maxPlayers > 0 && participantCount >= t.maxPlayers
            const isDeadlinePassed = t.registrationDeadline ? new Date(t.registrationDeadline) < new Date() : false
            
            return (
              <div key={t.id} className="card glass animate-fade-in" style={{ 
                display: 'flex', flexDirection: 'column', 
                border: alreadyRegistered ? '1px solid hsl(var(--accent-blue))' : '1px solid var(--border-subtle)',
                opacity: isPast ? 0.7 : 1
              }}>
                {alreadyRegistered && (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: 'hsl(var(--accent-blue))', color: '#fff', fontSize: '0.65rem', fontWeight: 900, padding: '0.4rem 1rem', borderBottomLeftRadius: 'var(--radius-md)', letterSpacing: '0.05em' }}>REGISTERED</div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.level} LEVEL</span>
                        {t.maxPlayers && (
                          <span style={{
                            background: isFull ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                            color: isFull ? '#ef4444' : '#10b981',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}>
                            {participantCount} / {t.maxPlayers} Spots
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>{t.name}</h3>
                   </div>
                   {!isPast && <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>{formatINR(t.entryFee)}</div>}
                </div>

                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '2rem', minHeight: '48px', lineHeight: 1.6 }}>
                  {t.eligibilityCriteria || 'Open for all registered academy Tier athletes.'}
                </p>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <span style={{ fontWeight: 600 }}>{formatDate(t.date, 'long')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>{t.venue}</span>
                  </div>
                  {t.registrationDeadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.8rem', color: isDeadlinePassed ? '#f87171' : '#fb923c' }}>
                      <span style={{ fontSize: '1rem' }}>⏰</span>
                      <span>Cutoff: {formatDate(t.registrationDeadline, 'datetime')}</span>
                    </div>
                  )}
                </div>

                {isPast ? (
                  <button disabled className="btn btn-secondary" style={{ width: '100%', cursor: 'default' }}>Event Closed</button>
                ) : alreadyRegistered ? (
                  <button disabled className="btn btn-secondary" style={{ width: '100%', border: '1px solid #10b981', color: '#10b981', cursor: 'default' }}>✓ Registered</button>
                ) : isDeadlinePassed ? (
                  <button disabled className="btn btn-secondary" style={{ width: '100%', color: '#ef4444', cursor: 'not-allowed' }}>Registration Closed</button>
                ) : isFull ? (
                  <button disabled className="btn btn-secondary" style={{ width: '100%', color: '#f59e0b', cursor: 'not-allowed' }}>Capacity Full (Waitlist)</button>
                ) : (
                  <RegisterTournamentButton 
                    tournamentId={t.id}
                    studentId={studentId}
                    entryFee={t.entryFee}
                    isRegistered={alreadyRegistered}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
