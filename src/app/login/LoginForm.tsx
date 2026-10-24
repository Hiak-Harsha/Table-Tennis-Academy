'use client'

import { useActionState, useEffect, useState } from 'react'
import { unifiedLoginAction, AuthState } from '@/actions/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const isRegistered = searchParams.get('registered') === 'true'

  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const { showToast } = useToast()

  const [state, action] = useActionState(unifiedLoginAction, null as AuthState | null)

  // Re-run toast announcement on EVERY attempt using the timestamp nonce (fixes A6)
  useEffect(() => {
    if (state?.error) {
      showToast(state.error, 'ERROR')
    }
  }, [state?.ts, state?.error, showToast])

  const reasonNotice = (() => {
    switch (reason) {
      case 'expired':
        return 'Your session has expired. Please sign in again.'
      case 'suspended':
        return 'Your account is currently inactive. Please contact academy administration.'
      case 'unauthorized':
        return 'Access denied. Please sign in with appropriate credentials.'
      default:
        return null
    }
  })()

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 1rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: '8px',
    outline: 'none',
    fontSize: '0.9rem',
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at top right, hsla(343, 100%, 50%, 0.06), transparent 50%), radial-gradient(ellipse at bottom left, hsla(217, 91%, 60%, 0.06), transparent 50%), hsl(var(--bg-primary))',
        padding: '1rem',
        flexDirection: 'column',
        gap: '1.5rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '800px',
          gap: '1.5rem',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        {/* Login Card */}
        <div className="card glass animate-fade-in auth-portal-card" style={{ borderRadius: '16px', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: isAdminMode ? 'hsl(var(--accent-blue))' : 'hsl(var(--accent-red))',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '1rem',
                margin: '0 auto 0.75rem auto',
                transform: 'rotate(-3deg)',
                boxShadow: isAdminMode
                  ? '0 6px 16px hsla(217, 91%, 60%, 0.3)'
                  : '0 6px 16px hsla(343, 100%, 50%, 0.3)',
              }}
            >
              🏓
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Sign In</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
              Table Tennis Academy Portal
            </p>
          </div>

          {/* Reason Notice for Stale/Expired Session */}
          {reasonNotice && (
            <div
              role="status"
              style={{
                background: 'hsla(38, 92%, 50%, 0.1)',
                border: '1px solid hsla(38, 92%, 50%, 0.3)',
                color: '#f59e0b',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              {reasonNotice}
            </div>
          )}

          {isRegistered && (
            <div
              style={{
                background: 'hsla(160, 100%, 50%, 0.05)',
                border: '1px solid hsla(160, 100%, 50%, 0.2)',
                color: '#10b981',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              ✓ Account created successfully. Please sign in to continue.
            </div>
          )}

          {/* Inline Accessible Error Alert (re-announced on error change/nonce) */}
          {state?.error && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                background: 'hsla(350, 89%, 60%, 0.1)',
                border: '1px solid hsla(350, 89%, 60%, 0.3)',
                color: '#f87171',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                lineHeight: 1.4,
              }}
            >
              {state.error}
            </div>
          )}

          {/* Role Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsAdminMode(false)}
              style={{
                flex: 1,
                padding: '0.45rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: !isAdminMode ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: !isAdminMode ? '#fff' : 'hsl(var(--text-muted))',
                fontWeight: 700,
                fontSize: '0.8rem',
                transition: '0.15s',
              }}
            >
              ATHLETE
            </button>
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              style={{
                flex: 1,
                padding: '0.45rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: isAdminMode ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isAdminMode ? 'hsl(var(--accent-blue))' : 'hsl(var(--text-muted))',
                fontWeight: 700,
                fontSize: '0.8rem',
                transition: '0.15s',
              }}
            >
              ADMIN
            </button>
          </div>

          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <input type="hidden" name="role" value={isAdminMode ? 'ADMIN' : 'STUDENT'} />

            <div>
              <label
                htmlFor="identifier"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'hsl(var(--text-muted))',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: '0.35rem',
                }}
              >
                {isAdminMode ? 'Username or Mobile' : 'Mobile Number or Student ID'}
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isAdminMode ? 'e.g. admin or 9876543210' : 'e.g. 98765 43210 or TTA-01001'}
                required
                autoComplete="username"
                inputMode={isAdminMode ? 'text' : 'tel'}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Password
                </label>
                {!isAdminMode && (
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue))', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: 0,
                  }}
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <LoadingButton
              variant={isAdminMode ? 'secondary' : 'primary'}
              loadingText="AUTHENTICATING..."
              style={{
                padding: '0.65rem',
                marginTop: '0.25rem',
                background: isAdminMode ? 'hsl(var(--accent-blue))' : undefined,
                width: '100%',
              }}
            >
              Sign In
            </LoadingButton>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>New athlete?</span>{' '}
            <Link href="/register" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700 }}>
              Register Here
            </Link>
          </div>
        </div>

        {/* Side Feature Cards */}
        <div
          style={{
            flex: '1 1 240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minWidth: '220px',
            maxWidth: '300px',
          }}
          className="animate-fade-in"
        >
          {[
            { icon: '🏓', title: 'Athlete Hub', desc: 'Manage your academy training & schedule.' },
            { icon: '🏆', title: 'Tournament Circuit', desc: 'Official tournaments and live draws.' },
            { icon: '💳', title: 'Transparent Ledger', desc: 'Secure online fee tracking and instant receipts.' },
          ].map((f, i) => (
            <div
              key={i}
              className="glass"
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '1.1rem' }}>{f.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/"
        style={{
          color: 'hsl(var(--text-muted))',
          textDecoration: 'none',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          opacity: 0.6,
        }}
      >
        ← Return to Home
      </Link>
    </div>
  )
}
