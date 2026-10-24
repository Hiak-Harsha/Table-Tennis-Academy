'use client'

import { useState, useEffect, useTransition } from 'react'
import { registerStudentAction, requestOtpAction, verifyOtpAction } from '@/actions/auth'
import Link from 'next/link'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

export default function RegisterWizard() {
  const [step, setStep] = useState<1 | 2>(1)
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    age: '',
    batchType: 'BEGINNER',
    password: '',
    guardianName: '',
    guardianPhone: '',
    guardianConsent: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [inputOtp, setInputOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const isMinor = Number(formData.age) > 0 && Number(formData.age) < 18

  // WebOTP API support on Android / supported browsers
  useEffect(() => {
    if (step === 2 && 'OTPCredential' in window) {
      const ac = new AbortController()
      ;(navigator as any).credentials
        ?.get({
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((otp: any) => {
          if (otp?.code) {
            setInputOtp(otp.code)
          }
        })
        .catch(() => {
          // Ignore WebOTP aborts or permission denials
        })

      return () => ac.abort()
    }
  }, [step])

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000)
      return () => clearInterval(timer)
    }
  }, [cooldown])

  // Step 1: Request 6-digit OTP
  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!formData.fullName || !formData.phone || !formData.password || !formData.age) {
      const err = 'All applicant details are required.'
      setErrorMessage(err)
      showToast(err, 'ERROR')
      return
    }

    if (isMinor) {
      if (!formData.guardianName || !formData.guardianPhone) {
        const err = 'Guardian name and contact phone are required for athletes under 18.'
        setErrorMessage(err)
        showToast(err, 'ERROR')
        return
      }
      if (!formData.guardianConsent) {
        const err = 'Parental or guardian consent confirmation is required for athletes under 18.'
        setErrorMessage(err)
        showToast(err, 'ERROR')
        return
      }
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', formData.phone)
      fd.append('purpose', 'REGISTER')

      const res = await requestOtpAction(null, fd)
      if (res.success) {
        showToast(res.message, 'SUCCESS')
        setCooldown(res.cooldownSeconds || 30)
        setStep(2)
      } else {
        setErrorMessage(res.message)
        showToast(res.message, 'ERROR')
      }
    })
  }

  // Step 2: Verify 6-digit OTP and complete account creation
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (inputOtp.trim().length !== 6) {
      const err = 'Please enter the 6-digit verification code.'
      setErrorMessage(err)
      showToast(err, 'ERROR')
      return
    }

    startTransition(async () => {
      const verifyFd = new FormData()
      verifyFd.append('phone', formData.phone)
      verifyFd.append('purpose', 'REGISTER')
      verifyFd.append('code', inputOtp.trim())

      const verifyRes = await verifyOtpAction(null, verifyFd)
      if (!verifyRes.success || !verifyRes.verificationToken) {
        setErrorMessage(verifyRes.message)
        showToast(verifyRes.message, 'ERROR')
        return
      }

      showToast('Mobile verified successfully! Completing registration...', 'SUCCESS')

      // Complete registration with single-use verificationToken
      const regFd = new FormData()
      regFd.append('fullName', formData.fullName)
      regFd.append('phone', formData.phone)
      regFd.append('password', formData.password)
      regFd.append('age', String(formData.age))
      regFd.append('batchType', formData.batchType)
      regFd.append('verificationToken', verifyRes.verificationToken)

      if (isMinor) {
        regFd.append('guardianName', formData.guardianName)
        regFd.append('guardianPhone', formData.guardianPhone)
        regFd.append('guardianConsent', 'true')
      }

      const regRes = await registerStudentAction(null, regFd)
      if (regRes?.error) {
        setErrorMessage(regRes.error)
        showToast(regRes.error, 'ERROR')
      }
    })
  }

  const handleResendOTP = () => {
    if (cooldown > 0) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', formData.phone)
      fd.append('purpose', 'REGISTER')

      const res = await requestOtpAction(null, fd)
      if (res.success) {
        showToast('A new 6-digit verification code has been dispatched.', 'SUCCESS')
        setCooldown(res.cooldownSeconds || 30)
      } else {
        showToast(res.message, 'ERROR')
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

  const labelStyle = {
    display: 'block',
    marginBottom: '0.35rem',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.75rem',
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at top right, hsla(343, 100%, 50%, 0.05), transparent 40%), radial-gradient(ellipse at bottom left, hsla(217, 91%, 60%, 0.05), transparent 40%), hsl(var(--bg-primary))',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2rem 1.75rem',
          borderRadius: '16px',
          margin: '0 auto',
        }}
      >
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                height: '4px',
                flex: 1,
                background: s <= step ? 'hsl(var(--accent-blue))' : 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                transition: '0.3s ease',
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: step === 2 ? '#10b981' : 'hsl(var(--accent-blue))',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: '1.1rem',
              margin: '0 auto 0.75rem auto',
              transform: 'rotate(-3deg)',
              transition: '0.2s',
            }}
          >
            🏓
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
            {step === 1 ? 'Athlete Registration' : 'Verify Mobile Number'}
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: 0 }}>
            {step === 1 ? 'Create your academy athlete account' : `6-digit security code sent to ${formData.phone}`}
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

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="fullName" style={labelStyle}>Full Name</label>
                <input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  type="text"
                  placeholder="e.g. Sharath Kamal"
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="age" style={labelStyle}>Age</label>
                <input
                  id="age"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  type="number"
                  min="5"
                  max="70"
                  placeholder="18"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" style={labelStyle}>Mobile Number (+91)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.65rem 0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'hsl(var(--text-muted))',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  +91
                </span>
                <input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9876543210"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="batchType" style={labelStyle}>Training Level</label>
              <select
                id="batchType"
                required
                value={formData.batchType}
                onChange={(e) => setFormData({ ...formData, batchType: e.target.value })}
                style={{ ...inputStyle, background: 'hsl(var(--bg-primary))', appearance: 'none' as const }}
              >
                <option value="BEGINNER">Foundational (Beginner)</option>
                <option value="INTERMEDIATE">Competitive (Intermediate)</option>
                <option value="ADVANCED">Elite Pre-Pro (Advanced)</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="password" style={labelStyle}>Password (Minimum 8 Characters)</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  {showPassword ? '👁 Hide' : '👁 Show'}
                </button>
              </div>
              <input
                id="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            {/* Minor Consent Section for Athletes under 18 */}
            {isMinor && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>
                  Parental / Guardian Consent (Athlete Under 18)
                </div>

                <div>
                  <label htmlFor="guardianName" style={labelStyle}>Guardian Full Name</label>
                  <input
                    id="guardianName"
                    required={isMinor}
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="guardianPhone" style={labelStyle}>Guardian Contact Number (+91)</label>
                  <input
                    id="guardianPhone"
                    required={isMinor}
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    type="tel"
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                    style={inputStyle}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    required={isMinor}
                    checked={formData.guardianConsent}
                    onChange={(e) => setFormData({ ...formData, guardianConsent: e.target.checked })}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span>
                    I confirm that I am the legal guardian of the applicant and hereby grant consent for their training enrollment and academy communications.
                  </span>
                </label>
              </div>
            )}

            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', lineHeight: '1.4', margin: '0.25rem 0' }}>
              By continuing, you agree to the{' '}
              <Link href="/terms" target="_blank" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'underline' }}>
                Terms & Rules
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'underline' }}>
                Privacy Policy
              </Link>
              .
            </p>

            <LoadingButton
              variant="primary"
              loadingText="SENDING CODE..."
              style={{ marginTop: '0.25rem', width: '100%' }}
            >
              Verify Mobile & Continue →
            </LoadingButton>
          </form>
        )}

        {/* STEP 2: Authoritative 6-digit OTP Verification */}
        {step === 2 && (
          <form
            onSubmit={handleVerifyOTP}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}
          >
            <div>
              <input
                maxLength={6}
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                placeholder="000000"
                style={{
                  width: '200px',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '2px solid hsl(var(--accent-blue))',
                  color: '#fff',
                  borderRadius: '12px',
                  outline: 'none',
                  textAlign: 'center',
                  fontSize: '1.6rem',
                  letterSpacing: '0.4rem',
                  fontWeight: 700,
                  margin: '0 auto',
                  fontFamily: 'monospace',
                }}
              />
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Enter the 6-digit verification code sent to your mobile
              </p>
            </div>

            <LoadingButton
              variant="primary"
              loadingText="VERIFYING CODE..."
              style={{ width: '100%', background: '#10b981', color: '#000', fontWeight: 800 }}
            >
              Verify & Complete Registration
            </LoadingButton>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--text-muted))',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                ← Edit Details
              </button>

              <div aria-live="polite" aria-atomic="true">
                <button
                  type="button"
                  disabled={cooldown > 0 || isPending}
                  onClick={handleResendOTP}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: cooldown > 0 ? 'hsl(var(--text-muted))' : 'hsl(var(--accent-blue))',
                    cursor: cooldown > 0 ? 'default' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'hsl(var(--text-muted))' }}>Already registered?</span>{' '}
          <Link href="/login" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
