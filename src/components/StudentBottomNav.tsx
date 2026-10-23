'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavTab {
  href: string
  label: string
  icon: string
  exact?: boolean
}

const TABS: NavTab[] = [
  { href: '/student', label: 'Dashboard', icon: '🏓', exact: true },
  { href: '/student/fees', label: 'Payments', icon: '💳' },
  { href: '/student/tournaments', label: 'Tournaments', icon: '🏆' },
  { href: '/student/connect', label: 'Circle', icon: '🤝' },
]

export default function StudentBottomNav() {
  const pathname = usePathname()

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="mobile-bottom-nav mobile-only"
    >
      {TABS.map((tab) => {
        const isActive = tab.exact 
          ? pathname === tab.href 
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '0.4rem 0.6rem',
              minWidth: '56px',
              minHeight: '44px',
              borderRadius: '8px',
              color: isActive ? 'hsl(var(--accent-red))' : 'hsl(var(--text-muted))',
              transition: 'color 0.15s ease',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
