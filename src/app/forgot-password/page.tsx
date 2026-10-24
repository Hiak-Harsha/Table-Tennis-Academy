'use client'

import { useState, useTransition } from 'react'
import {
  requestPasswordResetAction,
  verifyOtpAction,
  resetPasswordAction,
} from '@/actions/auth'
import Link from 'next/link'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const { showToast } = useToast()
  const [, startTransition] = useTransition()

  // Step 1: Request OTP for password reset
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!phone.trim()) {
      const err = 'Please enter your registered mobile number.'
      setErrorMessage(err)
      showToast(err, 'ERROR')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', phone.trim())

      const res = await requestPasswordResetAction(null, fd)
      if (res.success) {
        showToast(res.message, 'SUCCESS')
        setStep(2)
      } else {
        setErrorMessage(res.message)
        showToast(res.message, 'ERROR')
      }
    })
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (code.trim().length !== 6) {
      const err = 'Please enter the 6-digit verification code.'
      setErrorMessage(err)
      showToast(err, 'ERROR')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', phone.trim())
      fd.append('purpose', 'PASSWORD_RESET')
      fd.append('code', code.trim())

      const res = await verifyOtpAction(null, fd)
      if (res.success && res.verificationToken) {
        setVerificationToken(res.verificationToken)
        showToast('Code verified successfully.', 'SUCCESS')
        setStep(3)
      } else {
        setErrorMessage(res.message)
        showToast(res.message, 'ERROR')
      }
    })
  }

  // Step 3: Set new password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (newPassword.length < 8) {
      const err = 'Password must be at least 8 characters long.'
      setErrorMessage(err)
      showToast(err, 'ERROR')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', phone.trim())
      fd.append('verificationToken', verificationToken)
      fd.append('newPassword', newPassword)

      const res = await resetPasswordAction(null, fd)
      if (res.error) {
        setErrorMessage(res.error)
        showToast(res.error, 'ERROR')
      } else {
        setIsSuccess(true)
        showToast('Password reset successfully! Please sign in with your new password.', 'SUCCESS')
      }
    })
  }

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
        className="card glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2rem 1.75rem',
          borderRadius: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'hsl(var(--accent-blue))',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: '1rem',
              margin: '0 auto 0.75rem auto',
              transform: 'rotate(-3deg)',
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Password Recovery</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
            Reset your academy portal password
          </p>
        </div>

        {errorMessage && (
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
            {errorMessage}
          </div>
        )}

        {isSuccess ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: 'hsla(160, 100%, 50%, 0.08)',
                border: '1px solid hsla(160, 100%, 50%, 0.25)',
                color: '#10b981',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              ✓ Your password has been reset successfully. All active sessions have been signed out for security.
            </div>
            <Link
              href="/login"
              className="btn btn-primary"
              style={{
                textDecoration: 'none',
                padding: '0.65rem',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Proceed to Sign In →
            </Link>
          </div>
        ) : (
          <>
            {step === 1 && (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label
                    htmlFor="reset-phone"
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
                    Registered Mobile Number (+91)
                  </label>
                  <input
                    id="reset-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    style={inputStyle}
                  />
                </div>

                <LoadingButton
                  variant="primary"
                  loadingText="SENDING CODE..."
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Send Verification Code →
                </LoadingButton>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>
                    Enter the 6-digit code sent to your mobile
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                    style={{
                      ...inputStyle,
                      width: '180px',
                      margin: '0 auto',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      letterSpacing: '0.3rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <LoadingButton
                  variant="primary"
                  loadingText="VERIFYING..."
                  style={{ width: '100%' }}
                >
                  Verify Code →
                </LoadingButton>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label
                    htmlFor="new-password"
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
                    New Password (Min 8 Characters)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
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
                  variant="primary"
                  loadingText="SAVING NEW PASSWORD..."
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Save New Password
                </LoadingButton>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem' }}>
              <Link href="/login" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
