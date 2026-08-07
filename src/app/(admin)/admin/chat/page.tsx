'use client'

import { useState } from 'react'
import BatchChat from '@/components/BatchChat'

const batches = [
  { id: 'BEGINNER', label: 'Foundation', color: '#3b82f6', icon: '🌱' },
  { id: 'INTERMEDIATE', label: 'Competitive', color: '#f59e0b', icon: '🔥' },
  { id: 'ADVANCED', label: 'Elite', color: '#ef4444', icon: '🏆' },
]

export default function AdminBatchHub() {
  const [activeBatch, setActiveBatch] = useState(batches[0].id)

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem' }}>Batch Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Monitor and broadcast across tiers.</p>
        </div>
        <span style={{ background: '#ef444415', border: '1px solid #ef444430', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#f87171', fontWeight: 700, fontSize: '0.65rem' }}>
          🛡️ ADMIN
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: Batch Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Tiers</h4>
          {batches.map(b => (
            <button key={b.id} onClick={() => setActiveBatch(b.id)} style={{
              textAlign: 'left', padding: '0.65rem 0.75rem', borderRadius: '8px', cursor: 'pointer', transition: '0.15s',
              background: activeBatch === b.id ? `${b.color}15` : 'rgba(255,255,255,0.02)',
              border: activeBatch === b.id ? `1.5px solid ${b.color}` : '1.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '0.65rem'
            }}>
              <span style={{ fontSize: '1rem' }}>{b.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: activeBatch === b.id ? '#fff' : '#94a3b8', fontSize: '0.8rem' }}>{b.label}</div>
                <div style={{ fontSize: '0.6rem', color: activeBatch === b.id ? b.color : 'hsl(var(--text-muted))' }}>{b.id}</div>
              </div>
            </button>
          ))}

          <div style={{ marginTop: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.7rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>Tip</h4>
            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, margin: 0 }}>Share training files directly in chat.</p>
          </div>
        </div>

        {/* Right: Chat */}
        <BatchChat batchType={activeBatch} isAdmin={true} />
      </div>
    </div>
  )
}
