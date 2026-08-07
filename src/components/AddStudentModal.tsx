'use client'

import { useState, useActionState, useEffect } from 'react'
import { createStudentAction } from '@/actions/admin'
import { useToast } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

export default function AddStudentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction] = useActionState(createStudentAction, null)
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
        <span>+</span> Register New Athlete
      </button>

      {isOpen && (
        <div
          onClick={e => e.target === e.currentTarget && setIsOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1.5rem' 
          }}
        >
          <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '580px', padding: '2.5rem', border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 900 }}>Register Athlete</h2>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', margin: 0 }}>This creates an official record and student master account.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}
              >✕</button>
            </div>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input required name="name" type="text" placeholder="e.g. Marcus Vane" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Age</label>
                  <input required name="age" type="number" min="5" max="80" defaultValue="18" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Phone / Identity Key</label>
                <input required name="phone" type="text" placeholder="10-digit number" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Security Master Key (Min 6 Chars)</label>
                <input required name="password" type="password" placeholder="••••••••" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Curriculum Tier</label>
                  <select required name="batch" style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="BEGINNER">Foundational</option>
                    <option value="INTERMEDIATE">Competitive Edge</option>
                    <option value="ADVANCED">Elite / Pro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Assigned Mentor</label>
                  <input name="coachName" type="text" placeholder="Coach Name" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Emergency Nexus (Contact)</label>
                <input name="contactDetails" type="text" placeholder="Contact person or email" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <LoadingButton loadingText="Registering..." style={{ flex: 1, padding: '1.1rem' }}>
                   Confirm & Create Account
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
