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

  useEffect(() => {
    if (state?.error) showToast(state.error, 'ERROR')
  }, [state?.error, showToast])

  const inputStyle = {
    width: '100%', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px',
    outline: 'none', fontSize: '0.9rem'
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
              width: '40px', height: '40px', borderRadius: '10px',
              background: isAdminMode ? 'hsl(var(--accent-blue))' : 'hsl(var(--accent-red))',
              display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1rem',
              margin: '0 auto 1rem auto', transform: 'rotate(-3deg)',
              boxShadow: isAdminMode ? '0 6px 16px hsla(217, 91%, 60%, 0.3)' : '0 6px 16px hsla(343, 100%, 50%, 0.3)'
            }}>🏓</div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Nexus Entry</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Secure synchronization with Academy protocols.</p>
          </div>

          {isRegistered && (
            <div style={{
              background: 'hsla(160, 100%, 50%, 0.05)', border: '1px solid hsla(160, 100%, 50%, 0.2)',
              color: '#10b981', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem',
              fontSize: '0.7rem', textAlign: 'center', fontWeight: 600
            }}>
              ✓ Mobile Identity Synced. Access Granted.
            </div>
          )}

          {/* Role Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '3px', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={() => setIsAdminMode(false)}
              style={{
                flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: !isAdminMode ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: !isAdminMode ? '#fff' : 'hsl(var(--text-muted))', fontWeight: 700, fontSize: '0.8rem', transition: '0.15s'
              }}>ATHLETE</button>
            <button type="button" onClick={() => setIsAdminMode(true)}
              style={{
                flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: isAdminMode ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isAdminMode ? 'hsl(var(--accent-blue))' : 'hsl(var(--text-muted))', fontWeight: 700, fontSize: '0.8rem', transition: '0.15s'
              }}>OVERSEER</button>
          </div>

          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <input type="hidden" name="role" value={isAdminMode ? 'ADMIN' : 'STUDENT'} />

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                {isAdminMode ? 'System Identifier' : 'ID / Mobile'}
              </label>
              <input name="identifier" type="text" placeholder={isAdminMode ? "Admin UID" : "e.g. 1234567890"} required style={inputStyle} />
            </div>

            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Security Key</label>
              <input name="password" type="password" placeholder="••••••••" required style={inputStyle} />
            </div>

            <LoadingButton
              variant={isAdminMode ? 'secondary' : 'primary'}
              loadingText="VERIFYING..."
              style={{ padding: '0.6rem', marginTop: '0.25rem', background: isAdminMode ? 'hsl(var(--accent-blue))' : undefined, width: '100%' }}
            >
              {isAdminMode ? 'AUTHORIZE' : 'SYNC WITH HUB'}
            </LoadingButton>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>Not in the circuit?</span>{' '}
            <Link href="/register" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700 }}>APPLY HERE</Link>
          </div>
        </div>

        {/* Side Feature Cards */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: '220px', maxWidth: '280px' }} className="animate-fade-in">
          {[
            { icon: '🌐', title: 'Athlete Circle', desc: 'Secure circuit communication.' },
            { icon: '🏆', title: 'Tournament Hub', desc: 'Real-time event discovery.' },
            { icon: '🛡️', title: 'Secure Ledger', desc: 'Immutable financial transparency.' }
          ].map((f, i) => (
            <div key={i} className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', gap: '0.75rem', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1rem' }}>{f.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{f.desc}</p>
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
