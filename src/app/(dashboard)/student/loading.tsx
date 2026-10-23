export default function StudentLoading() {
  return (
    <div 
      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top Banner Skeleton */}
      <div 
        style={{ 
          height: '120px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          animation: 'pulse 1.5s ease-in-out infinite' 
        }} 
      />

      {/* Grid Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '110px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>

      {/* Content Skeleton */}
      <div 
        style={{ 
          height: '320px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          animation: 'pulse 1.5s ease-in-out infinite' 
        }} 
      />
    </div>
  )
}
