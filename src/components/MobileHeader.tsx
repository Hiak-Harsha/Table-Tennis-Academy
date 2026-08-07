'use client'

import { useState, useEffect } from 'react'

interface MobileHeaderProps {
  onMenuToggle: () => void
  portalName: string
}

export default function MobileHeader({ onMenuToggle, portalName }: MobileHeaderProps) {
  return (
    <header className="mobile-only glass" style={{
      height: '64px',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.25rem',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <button 
          onClick={onMenuToggle}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
          {portalName}
        </div>
      </div>
      
      <div style={{ 
        width: '32px', height: '32px', borderRadius: '50%', 
        background: 'linear-gradient(135deg, hsl(var(--accent-red)), #9f1239)',
        display: 'grid', placeItems: 'center', fontSize: '1rem'
      }}>
        🏓
      </div>
    </header>
  )
}
