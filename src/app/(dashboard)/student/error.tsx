'use client'

import { useEffect } from 'react'

export default function StudentDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[STUDENT_DASHBOARD_ERROR]', error)
  }, [error])

  return (
    <div className="card glass animate-fade-in" style={{
      maxWidth: '540px',
      margin: '2rem auto',
      textAlign: 'center',
      padding: '2.5rem',
      borderRadius: '16px',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        Failed to Load Player View
      </h3>
      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        We encountered a temporary issue while fetching your player information.
      </p>
      <button
        onClick={() => reset()}
        className="btn btn-primary"
        style={{ padding: '0.75rem 1.5rem', minHeight: '44px' }}
      >
        ↺ Reload Player View
      </button>
    </div>
  )
}
