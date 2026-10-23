export default function AdminLoading() {
  return (
    <div 
      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top Banner Skeleton */}
      <div 
        style={{ 
          height: '110px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          animation: 'pulse 1.5s ease-in-out infinite' 
        }} 
      />

      {/* Metrics Row Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '90px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }}>
        <div 
          style={{ 
            height: '350px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            animation: 'pulse 1.5s ease-in-out infinite' 
          }} 
        />
        <div 
          style={{ 
            height: '350px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            animation: 'pulse 1.5s ease-in-out infinite' 
          }} 
        />
      </div>
    </div>
  )
}
