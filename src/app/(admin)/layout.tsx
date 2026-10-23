'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import MobileHeader from '@/components/MobileHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'hsl(var(--bg-primary))', width: '100%', overflowX: 'hidden' }}>
      <MobileHeader portalName="TTA Command" onMenuToggle={() => setSidebarOpen(true)} />
      
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        width: '100%',
        minWidth: 0,
      }}>
        <header className="desktop-only" style={{ 
          height: '56px', 
          background: 'rgba(8,15,30,0.95)', 
          borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 2rem', 
          flexShrink: 0 
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            TTA Elite · Admin Control Panel · All Records Active
          </div>
        </header>

        <div className="main-content-viewport" style={{ 
          padding: '1.5rem 1rem', 
          flex: 1, 
          overflowY: 'auto',
          boxSizing: 'border-box',
          width: '100%',
        }}>
          <div className="nexus-container">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
