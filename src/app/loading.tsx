export default function RootLoading() {
  return (
    <div 
      style={{ 
        minHeight: '100dvh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'hsl(var(--bg-primary))',
        color: '#fff',
        gap: '1rem'
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div 
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 106, 19, 0.2)',
          borderTopColor: 'var(--ball-orange)',
          animation: 'spin 0.8s linear infinite',
        }} 
      />
      <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>
        Loading Academy Hub...
      </div>
    </div>
  )
}
