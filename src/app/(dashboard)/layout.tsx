'use client'

import { useState } from 'react'
import StudentSidebar from '@/components/StudentSidebar'
import StudentBottomNav from '@/components/StudentBottomNav'
import MobileHeader from '@/components/MobileHeader'
import NotificationBell from '@/components/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'hsl(var(--bg-primary))' }}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <MobileHeader portalName="TTA Player Portal" onMenuToggle={() => setSidebarOpen(true)} />
      
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        width: '100%' 
      }}>
        <header className="desktop-only" style={{ 
          height: '56px', 
          background: 'rgba(8,15,30,0.95)', 
          borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 2rem', 
          flexShrink: 0 
        }}>
          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            TTA Elite · Player Portal · Live Match & Training Sync
          </div>
          <NotificationBell />
        </header>

        <div className="main-content-viewport has-bottom-nav" style={{ 
          padding: '2rem 1.5rem', 
          flex: 1, 
          overflowY: 'auto'
        }}>
          <div id="main-content" className="academy-container" tabIndex={-1}>
            {children}
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  )
}
