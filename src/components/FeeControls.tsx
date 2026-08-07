'use client'

import { useState, useTransition, useActionState, useEffect } from 'react'
import { updateFeeStatusAction, addFeeAction } from '@/actions/fees'

const sel = {
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f1f5f9',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  fontSize: '0.82rem',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
} as const

// ─── Status Badge (client, handles inline change) ────────────────────────────
export function FeeStatusControl({ feeId, status }: { feeId: string; status: string }) {
  const [current, setCurrent] = useState(status)
  const [isPending, startTransition] = useTransition()

  const handleChange = (newStatus: string) => {
    startTransition(async () => {
      await updateFeeStatusAction(feeId, newStatus)
      setCurrent(newStatus)
    })
  }

  const colors: Record<string, { bg: string; color: string }> = {
    PAID:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
    DUE:      { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
    OVERDUE:  { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
  }
  const c = colors[current] || colors.DUE

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ background: c.bg, color: c.color, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, minWidth: '52px', textAlign: 'center' }}>
        {current}
      </span>
      <select
        value={current}
        onChange={e => handleChange(e.target.value)}
        disabled={isPending}
        style={{ ...sel, opacity: isPending ? 0.5 : 1 }}
      >
        <option value="DUE">Mark DUE</option>
        <option value="PAID">Mark PAID</option>
        <option value="OVERDUE">Mark OVERDUE</option>
      </select>
    </div>
  )
}

// ─── Add Fee Modal ────────────────────────────────────────────────────────────
export function AddFeeModal({ students }: { students: { id: string; studentId: string; fullName: string }[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addFeeAction, null)

  useEffect(() => {
    if (state?.success) setOpen(false)
  }, [state])

  const inputStyle = {
    width: '100%',
    padding: '0.7rem 0.875rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9',
    borderRadius: '8px',
    outline: 'none',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
  } as const

  const labelStyle = {
    display: 'block',
    marginBottom: '0.35rem',
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary"
        style={{ background: '#10b981', color: '#000', fontWeight: 800 }}
      >
        + Add Fee Record
      </button>

      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: '1rem' }}
        >
          <div style={{ width: '100%', maxWidth: '480px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#f1f5f9' }}>Add Fee Record</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={labelStyle}>Student</label>
                <select required name="studentId" style={{ ...inputStyle, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', appearance: 'none', background: '#1e293b', paddingRight: '2rem' }}>
                  <option value="">Select student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Payment Interval</label>
                <select required name="interval" style={{ ...inputStyle, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', appearance: 'none', background: '#1e293b', paddingRight: '2rem' }}>
                  <option value="MONTHLY">Monthly Billing</option>
                  <option value="QUARTERLY">Quarterly (3 Months)</option>
                  <option value="YEARLY">Yearly (Annual)</option>
                  <option value="ONE_TIME">One-Time Payment</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Amount (₹)</label>
                  <input required name="amount" type="number" min="1" step="0.01" placeholder="e.g. 2500" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input required name="dueDate" type="date" style={inputStyle} />
                </div>
              </div>

              {state?.error && (
                <div style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '0.7rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>⚠ {state.error}</div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '0.8rem', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                  {pending ? 'Adding...' : '✓ Add Fee Record'}
                </button>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: '0.8rem 1.25rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
