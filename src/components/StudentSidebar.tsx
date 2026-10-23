'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/actions/auth'

const navLinks = [
  { href: '/student', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/student/fees', label: 'Payments', icon: '💳', exact: false },
  { href: '/student/tournaments', label: 'Tournaments', icon: '🏆', exact: false },
  { href: '/student/connect', label: 'Athlete Circle', icon: '🤝', exact: false },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function StudentSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="mobile-only" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)', zIndex: 998
        }} />
      )}

      <aside className="glass" style={{
        width: '220px', height: '100vh', padding: '1.25rem 1rem',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', top: 0, left: 0, zIndex: 999,
        transform: `translateX(${isOpen ? '0' : '-100%'})`,
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} id="student-sidebar">

        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Athlete Portal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, hsl(var(--accent-red)), #9f1239)',
                display: 'grid', placeItems: 'center', fontSize: '0.9rem'
              }}>🏓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>TTA Global</div>
                <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>Member</div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="mobile-only" style={{
            background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer'
          }}>✕</button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {navLinks.map(link => {
            const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <Link key={link.href} href={link.href} onClick={onClose} style={{
                color: isActive ? '#fff' : 'hsl(var(--text-secondary))',
                textDecoration: 'none', padding: '0.5rem 0.65rem', borderRadius: '6px',
                fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '0.55rem', transition: '0.15s',
                border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent'
              }}>
                <span style={{ fontSize: '0.85rem', opacity: isActive ? 1 : 0.5 }}>{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', color: '#f87171', fontSize: '0.75rem' }}>
              🚪 Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
