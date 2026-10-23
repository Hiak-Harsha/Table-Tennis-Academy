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
      const timer = setTimeout(() => setIsOpen(false), 0)
      return () => clearTimeout(timer)
    } else if (state?.error) {
      showToast(state.error, 'ERROR')
    }
  }, [state, showToast])

  const inputStyle = {
    width: '100%',
    padding: '0.7rem 1rem',
    background: 'hsl(var(--bg-primary))',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.9rem',
    boxSizing: 'border-box' as const,
    transition: 'all 0.2s',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.4rem',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        <span>🏆</span> Host New Tournament
      </button>

      {isOpen && (
        <div 
          onClick={e => e.target === e.currentTarget && setIsOpen(false)}
          className="modal-overlay"
        >
          <div className="card glass animate-fade-in modal-content" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', fontWeight: 700 }}>Create Tournament</h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', margin: 0 }}>This will be published immediately to all athlete dashboards.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}
              >✕</button>
            </div>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Tournament Designation</label>
                <input required name="name" type="text" placeholder="e.g. Winter Smash Championship 2026" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Max Capacity (Players)</label>
                  <input name="maxPlayers" type="number" min="2" placeholder="e.g. 32 (optional)" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Registration Cutoff</label>
                  <input name="registrationDeadline" type="date" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <LoadingButton loadingText="Publishing Event..." style={{ flex: '1 1 180px', padding: '0.75rem' }}>
                   Confirm & Publish Event
                </LoadingButton>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsOpen(false)} 
                  style={{ flex: '0 0 auto', padding: '0.75rem 1.5rem' }}
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
