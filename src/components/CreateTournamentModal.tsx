'use client'

import { useState, useActionState, useEffect } from 'react'
import { createTournamentAction } from '@/actions/admin'
import { useToast } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

export default function CreateTournamentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction] = useActionState(createTournamentAction, null)
  const { showToast } = useToast()

  useEffect(() => {
    if (state?.success) {
      showToast(state.success, 'SUCCESS')
      setIsOpen(false)
    } else if (state?.error) {
      showToast(state.error, 'ERROR')
    }
  }, [state, showToast])

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'hsl(var(--bg-primary))',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.7rem',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em'
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        <span>🏆</span> Host New Tournament
      </button>

      {isOpen && (
        <div 
          onClick={e => e.target === e.currentTarget && setIsOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'grid', 
            placeItems: 'center', backdropFilter: 'blur(10px)', padding: '1.5rem' 
          }}
        >
          <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '580px', padding: '2.5rem', border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 900 }}>Create Tournament</h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', margin: 0 }}>This will be published immediately to all athlete dashboards.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}
              >✕</button>
            </div>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Tournament Designation</label>
                <input required name="name" type="text" placeholder="e.g. Winter Smash Championship 2025" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Operations Date</label>
                  <input required name="date" type="date" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Entry Fee (₹)</label>
                  <input required name="entryFee" type="number" step="0.01" placeholder="2500" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Event Venue / Location</label>
                <input required name="venue" type="text" placeholder="e.g. TTA Main Arena, Hall A" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Performance Level</label>
                  <select required name="level" style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="BEGINNER">Foundational</option>
                    <option value="INTERMEDIATE">Competitive Edge</option>
                    <option value="ADVANCED">Elite / Pro</option>
                    <option value="OPEN">Open (All Levels)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Eligibility Constraints</label>
                  <input name="eligibility" type="text" placeholder="e.g. All registered members" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <LoadingButton loadingText="Publishing Event..." style={{ flex: 1, padding: '1.1rem' }}>
                   Confirm & Publish Event
                </LoadingButton>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsOpen(false)} 
                  style={{ flex: 'none', padding: '0.8rem 2rem' }}
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
