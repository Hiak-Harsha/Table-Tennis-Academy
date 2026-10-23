'use client'

import { useState } from 'react'
import Link from 'next/link'
import AddStudentModal from '@/components/AddStudentModal'

interface Student {
  id: string
  studentId: string
  fullName: string
  age: number
  batchType: string
  coachName?: string | null
  enrollmentStatus: string
  contactDetails?: string | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:     { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  INACTIVE:   { label: 'Inactive', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  SUSPENDED:  { label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  GRADUATED:  { label: 'Graduated', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
}

const batchConfig: Record<string, { label: string; color: string }> = {
  BEGINNER:     { label: 'Foundational', color: '#3b82f6' },
  INTERMEDIATE: { label: 'Competitive', color: '#f59e0b' },
  ADVANCED:     { label: 'Elite / Pro', color: '#ef4444' },
}

function getInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function StudentRosterClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [filterBatch, setFilterBatch] = useState('ALL')
  const [view, setView] = useState<'grid' | 'table'>('table')

  const filtered = students.filter(s => {
    const matchName = s.fullName.toLowerCase().includes(search.toLowerCase()) ||
                      s.studentId.toLowerCase().includes(search.toLowerCase())
    const matchBatch = filterBatch === 'ALL' || s.batchType === filterBatch
    return matchName && matchBatch
  })

  const stats = [
    { label: 'Total Athletes', value: students.length, icon: '👥', color: 'hsl(var(--accent-blue))' },
    { label: 'Active', value: students.filter(s => s.enrollmentStatus === 'ACTIVE').length, icon: '✅', color: '#10b981' },
    { label: 'Elite Tier', value: students.filter(s => s.batchType === 'ADVANCED').length, icon: '🏆', color: '#ef4444' },
    { label: 'Graduated', value: students.filter(s => s.enrollmentStatus === 'GRADUATED').length, icon: '🎓', color: '#8b5cf6' },
  ]

  const inputStyle = {
    padding: '0.65rem 1rem',
    background: 'hsl(var(--bg-primary))',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.85rem',
    boxSizing: 'border-box' as const,
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        {stats.map(s => (
          <div key={s.label} className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              <span style={{ fontSize: '1rem' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ flex: '1 1 240px', position: 'relative', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search by name or student ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: '1.75rem' }}>
             <option value="ALL">All Batches</option>
             <option value="BEGINNER">Foundational</option>
             <option value="INTERMEDIATE">Competitive</option>
             <option value="ADVANCED">Elite / Pro</option>
          </select>

          <div style={{ display: 'flex', background: 'hsl(var(--bg-card))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            {['grid', 'table'].map(v => (
              <button key={v} onClick={() => setView(v as any)} style={{
                padding: '0.6rem 0.85rem', background: view === v ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none', color: view === v ? '#fff' : 'hsl(var(--text-muted))', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem'
              }}>
                {v === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>

          <AddStudentModal />
        </div>
      </div>

      {/* Content */}
      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
           {filtered.map(s => {
             const st = statusConfig[s.enrollmentStatus] || statusConfig.ACTIVE
             const bt = batchConfig[s.batchType] || { label: s.batchType, color: '#fff' }
             return (
               <div key={s.id} className="card glass animate-fade-in" style={{ padding: '1.25rem', borderBottom: `3px solid ${bt.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                     <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'hsl(var(--bg-primary))', border: '1px solid var(--border-subtle)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1rem', color: bt.color }}>
                        {getInitials(s.fullName)}
                     </div>
                     <span style={{ fontSize: '0.7rem', fontWeight: 700, background: st.bg, color: st.color, padding: '0.2rem 0.6rem', borderRadius: '4px', height: 'fit-content' }}>
                        {st.label}
                     </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>{s.fullName}</h3>
                  <code style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue))' }}>{s.studentId}</code>

                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>Tier</span>
                        <span style={{ fontWeight: 600 }}>{bt.label}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>Mentor</span>
                        <span style={{ fontWeight: 600 }}>{s.coachName || 'Unassigned'}</span>
                     </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                     <Link 
                       href={`/admin/students/${s.id}/edit`} 
                       className="btn btn-secondary" 
                       style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', width: '100%', fontWeight: 700, textAlign: 'center' }}
                     >
                       ✏ Manage Athlete
                     </Link>
                  </div>
               </div>
             )
           })}
        </div>
      ) : (
        <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Athlete', 'Student ID', 'Batch', 'Coach', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="roster-row" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.85rem' }}>{s.fullName}</td>
                    <td style={{ padding: '0.75rem 1.25rem' }}><code style={{ color: 'hsl(var(--accent-blue))', fontSize: '0.8rem' }}>{s.studentId}</code></td>
                    <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem' }}>{s.batchType}</td>
                    <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>{s.coachName || '—'}</td>
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <span style={{ color: statusConfig[s.enrollmentStatus]?.color, fontSize: '0.8rem' }}>● {s.enrollmentStatus}</span>
                    </td>
                    <td style={{ padding: '0.5rem 1.25rem' }}>
                      <Link 
                         href={`/admin/students/${s.id}/edit`} 
                         style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}
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
