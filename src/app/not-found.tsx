import Link from 'next/link'

export default function NotFound() {
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
        padding: '3rem 2rem',
        borderRadius: '16px',
        border: '1px solid var(--border-medium)',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: 1 }}>🏓</div>
        <div style={{ 
          fontSize: '3rem', 
          fontWeight: 900, 
          color: 'var(--ball-orange)', 
          letterSpacing: '-0.02em',
          marginBottom: '0.25rem' 
        }}>
          404
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Ball Out of Bounds
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          The court or page you are looking for does not exist or has been relocated to another table.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/home"
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem', minHeight: '44px', textDecoration: 'none', display: 'grid', placeItems: 'center' }}
          >
            Academy Home
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.75rem', minHeight: '44px', textDecoration: 'none', display: 'grid', placeItems: 'center' }}
          >
            Player Login
          </Link>
        </div>
      </div>
    </div>
  )
}
