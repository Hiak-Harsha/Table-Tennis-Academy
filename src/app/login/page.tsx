'use client'

import { useActionState, useEffect, useState, Suspense } from 'react'
import { unifiedLoginAction } from '@/actions/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

function LoginContent() {
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'
  const [isAdminMode, setIsAdminMode] = useState(false)
  const { showToast } = useToast()

  const [state, action] = useActionState(unifiedLoginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state?.error) showToast(state.error, 'ERROR')
  }, [state?.error, showToast])

  const inputStyle = {
    width: '100%', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px',
    outline: 'none', fontSize: '1rem', minHeight: '44px'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top right, hsla(343, 100%, 50%, 0.06), transparent 50%), radial-gradient(ellipse at bottom left, hsla(217, 91%, 60%, 0.06), transparent 50%), hsl(var(--bg-primary))',
      padding: '1rem', flexDirection: 'column', gap: '1.5rem'
    }}>

      <div style={{
        display: 'flex', width: '100%', maxWidth: '800px', gap: '1.5rem',
        alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap'
      }}>

        {/* Login Card */}
        <div className="card glass animate-fade-in auth-portal-card" style={{ borderRadius: '16px', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: isAdminMode ? 'var(--table-blue)' : 'var(--ball-orange)',
              display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.25rem',
              margin: '0 auto 1rem auto',
              boxShadow: isAdminMode ? '0 6px 16px var(--table-blue-glow)' : '0 6px 16px var(--ball-orange-glow)'
            }}>🏓</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem', fontWeight: 800 }}>Academy Sign In</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Access your player training hub, schedule, and tournaments.</p>
          </div>

          {isRegistered && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981', padding: '0.65rem', borderRadius: '8px', marginBottom: '1rem',
              fontSize: '0.8rem', textAlign: 'center', fontWeight: 700
            }}>
              ✓ Account created successfully! Please sign in.
            </div>
          )}

          {/* Role Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px', marginBottom: '1.25rem', border: '1px solid var(--paddle-border)' }}>
            <button type="button" onClick={() => setIsAdminMode(false)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: !isAdminMode ? 'var(--ball-orange)' : 'transparent',
                color: !isAdminMode ? '#0B0E14' : '#94a3b8', fontWeight: 800, fontSize: '0.85rem', transition: '0.15s'
              }}>PLAYER</button>
            <button type="button" onClick={() => setIsAdminMode(true)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: isAdminMode ? 'var(--table-blue)' : 'transparent',
                color: isAdminMode ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.85rem', transition: '0.15s'
              }}>COACH DESK</button>
          </div>

          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <input type="hidden" name="role" value={isAdminMode ? 'ADMIN' : 'STUDENT'} />

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                {isAdminMode ? 'Coach / Admin Mobile' : 'Mobile Number or Player ID'}
              </label>
              <input name="identifier" type="text" placeholder={isAdminMode ? "e.g. 9999999999" : "e.g. 9876543210 or TTA-01001"} required style={inputStyle} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', padding: '0.2rem 0.4rem', fontWeight: 600 }}
                >
                  {showPassword ? '👁 Hide' : '👁 Show'}
                </button>
              </div>
              <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" required style={inputStyle} />
            </div>

            <LoadingButton
              variant={isAdminMode ? 'secondary' : 'primary'}
              loadingText="Signing In..."
              style={{
                padding: '0.75rem',
                marginTop: '0.5rem',
                background: isAdminMode ? 'var(--table-blue)' : 'var(--ball-orange)',
                color: isAdminMode ? '#fff' : '#0B0E14',
                fontWeight: 800,
                fontSize: '1rem',
                width: '100%'
              }}
            >
              Sign In
            </LoadingButton>

          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>New athlete joining the academy?</span>{' '}
            <Link href="/register" style={{ color: 'var(--ball-orange)', textDecoration: 'none', fontWeight: 800 }}>Register Here</Link>
          </div>
        </div>

        {/* Side Feature Cards */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px', maxWidth: '280px' }} className="animate-fade-in">
          {[
            { icon: '💬', title: 'Squad Chat', desc: 'Direct updates from head coaches & batch.' },
            { icon: '🏆', title: 'Tournament Circuit', desc: 'State opens and academy ranking events.' },
            { icon: '🛡️', title: 'Pass & Subscriptions', desc: 'Verified digital gate access and fee history.' }
          ].map((f, i) => (
            <div key={i} className="glass" style={{ padding: '0.85rem 1.15rem', borderRadius: '12px', display: 'flex', gap: '0.85rem', alignItems: 'center', border: '1px solid var(--paddle-border)' }}>
              <div style={{ fontSize: '1.3rem' }}>{f.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href="/" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.5 }}>
        ← Return to Main Terminal
      </Link>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'hsl(var(--bg-primary))', color: '#fff', fontSize: '0.85rem' }}>Connecting...</div>}>
      <LoginContent />
    </Suspense>
  )
}
