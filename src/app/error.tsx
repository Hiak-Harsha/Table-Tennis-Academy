'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GLOBAL_ERROR]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(var(--bg-primary))',
      color: '#fff',
      padding: '2rem',
    }}>
      <div className="card glass animate-fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        padding: '2.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border-medium)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Unexpected Match Interruption
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          An error occurred while loading this page. Our team has been notified.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', minHeight: '44px' }}
          >
            ↺ Try Again
          </button>
          <a
            href="/home"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.5rem', minHeight: '44px', textDecoration: 'none', display: 'grid', placeItems: 'center' }}
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  )
}
