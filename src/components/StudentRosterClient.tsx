'use client'

import { useState } from 'react'
import AddStudentModal from '@/components/AddStudentModal'
import Link from 'next/link'
import { exportToCsv } from '@/lib/csv-export'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  INACTIVE:  { label: 'Inactive',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  SUSPENDED: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  GRADUATED: { label: 'Graduated', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
}

const batchConfig: Record<string, { label: string; color: string }> = {
  BEGINNER:     { label: 'Foundational', color: '#3b82f6' },
  INTERMEDIATE: { label: 'Competitive',  color: '#f59e0b' },
  ADVANCED:     { label: 'Elite Pro',    color: '#ef4444' },
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

type Student = {
  id: string; studentId: string; fullName: string; age: number; batchType: string;
  coachName: string | null; contactDetails: string | null; enrollmentStatus: string;
}

export default function StudentRosterClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [filterBatch, setFilterBatch] = useState('ALL')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const filtered = students.filter(s => {
    const matchSearch = search === '' ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase())
    const matchBatch  = filterBatch  === 'ALL' || s.batchType === filterBatch
    return matchSearch && matchBatch
  })

  const stats = [
    { label: 'Total Players', value: students.length, icon: '👥', color: 'var(--accent-blue)' },
    { label: 'Active', value: students.filter(s => s.enrollmentStatus === 'ACTIVE').length, icon: '✅', color: '#10b981' },
    { label: 'Elite Pro Tier', value: students.filter(s => s.batchType === 'ADVANCED').length, icon: '🏆', color: '#ef4444' },
    { label: 'Graduated', value: students.filter(s => s.enrollmentStatus === 'GRADUATED').length, icon: '🎓', color: '#8b5cf6' },
  ]

  const inputStyle = {
    padding: '0.75rem 1rem',
    background: 'hsl(var(--bg-primary))',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.9rem',
  }

  const handleExportCsv = () => {
    const headers = ['Player ID', 'Full Name', 'Age', 'Batch', 'Coach', 'Status']
    const rows = filtered.map(s => [
      s.studentId,
      s.fullName,
      s.age,
      s.batchType,
      s.coachName || 'Unassigned',
      s.enrollmentStatus,
    ])
    exportToCsv('academy_player_roster', headers, rows)
  }

  return (
    <div className="animate-fade-in">
      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '240px', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search by player name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: '2rem' }}>
             <option value="ALL">All Batches</option>
             <option value="BEGINNER">Foundational</option>
             <option value="INTERMEDIATE">Competitive</option>
             <option value="ADVANCED">Elite / Pro</option>
          </select>

          <div style={{ display: 'flex', background: 'hsl(var(--bg-card))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            {['grid', 'table'].map(v => (
              <button key={v} onClick={() => setView(v as any)} style={{
                padding: '0.65rem 0.9rem', background: view === v ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none', color: view === v ? '#fff' : 'hsl(var(--text-muted))', cursor: 'pointer', transition: '0.2s'
              }}>
                {v === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>📥</span> Export CSV
          </button>

          <AddStudentModal />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="card glass animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏓</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Players Found</h3>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', margin: 0 }}>
            {search ? `No players matching "${search}". Try adjusting your search query or filters.` : 'No registered players found in this category.'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
           {filtered.map(s => {
             const st = statusConfig[s.enrollmentStatus] || statusConfig.ACTIVE
             const bt = batchConfig[s.batchType] || { label: s.batchType, color: '#fff' }
             return (
               <div key={s.id} className="card glass animate-fade-in" style={{ padding: '1.5rem', borderBottom: `4px solid ${bt.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                     <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'hsl(var(--bg-primary))', border: '1px solid var(--border-subtle)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '1.2rem', color: bt.color }}>
                        {getInitials(s.fullName)}
                     </div>
                     <span style={{ fontSize: '0.7rem', fontWeight: 900, background: st.bg, color: st.color, padding: '0.25rem 0.75rem', borderRadius: '4px', height: 'fit-content' }}>
                        {st.label}
                     </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{s.fullName}</h3>
                  <code style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-blue))' }}>{s.studentId}</code>

                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>Tier</span>
                        <span style={{ fontWeight: 700 }}>{bt.label}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>Coach</span>
                        <span style={{ fontWeight: 700 }}>{s.coachName || 'Unassigned'}</span>
                     </div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                     <Link 
                       href={`/admin/students/${s.id}/edit`} 
                       className="btn btn-secondary" 
                       style={{ fontSize: '0.8rem', padding: '0.65rem 1rem', width: '100%', fontWeight: 800, textAlign: 'center' }}
                     >
                       ✏ Manage Player Profile
                     </Link>
                  </div>
               </div>
             )
           })}
        </div>
      ) : (
        <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Player', 'Student ID', 'Batch', 'Coach', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>{s.fullName}</td>
                  <td style={{ padding: '1rem 1.5rem' }}><code style={{ color: 'hsl(var(--accent-blue))' }}>{s.studentId}</code></td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{s.batchType}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{s.coachName || '—'}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ color: statusConfig[s.enrollmentStatus]?.color }}>● {s.enrollmentStatus}</span>
                  </td>
                  <td style={{ padding: '0.5rem 1.5rem' }}>
                    <Link 
                       href={`/admin/students/${s.id}/edit`} 
                       style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}
                    >
                      Edit Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
