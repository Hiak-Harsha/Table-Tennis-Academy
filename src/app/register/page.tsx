'use client'

import { useState, useEffect, useTransition } from 'react'
import { registerStudentAction, requestOtpAction, verifyOtpAction } from '@/actions/auth'
import Link from 'next/link'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

export default function RegisterWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    age: '',
    batchType: 'BEGINNER',
    password: '',
  })
  const [inputOtp, setInputOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)

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
    if (!formData.fullName || !formData.phone || !formData.password || !formData.age) {
      showToast('All fields are required.', 'ERROR')
      return
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
        showToast(res.message, 'ERROR')
      }
    })
  }

  // Step 2: Verify 6-digit OTP and complete account creation
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputOtp.trim().length !== 6) {
      showToast('Please enter the 6-digit verification code.', 'ERROR')
      return
    }

    startTransition(async () => {
      const verifyFd = new FormData()
      verifyFd.append('phone', formData.phone)
      verifyFd.append('purpose', 'REGISTER')
      verifyFd.append('code', inputOtp.trim())

      const verifyRes = await verifyOtpAction(null, verifyFd)
      if (!verifyRes.success) {
        showToast(verifyRes.message, 'ERROR')
        return
      }

      showToast('Phone verified successfully! Finalizing account...', 'SUCCESS')

      // Complete registration with verified phone
      const regFd = new FormData()
      regFd.append('fullName', formData.fullName)
      regFd.append('phone', formData.phone)
      regFd.append('password', formData.password)
      regFd.append('age', String(formData.age))
      regFd.append('batchType', formData.batchType)

      const regRes = (await registerStudentAction(null, regFd)) as any
      if (regRes?.error) {
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

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
            {step === 1 ? 'Join the Academy' : 'Verify Mobile Number'}
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: 0 }}>
            {step === 1 ? 'Fill in your details to get started.' : `6-digit security code sent to ${formData.phone}`}
          </p>
        </div>

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  type="text"
                  placeholder="e.g. Sharath Kamal"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input
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
              <label style={labelStyle}>Mobile Number (+91)</label>
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
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Training Level</label>
              <select
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
              <label style={labelStyle}>Password (Minimum 8 Characters)</label>
              <input
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                type="password"
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <LoadingButton
              variant="primary"
              loadingText="SENDING CODE..."
              style={{ marginTop: '0.5rem', width: '100%' }}
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
                ← Edit Mobile
              </button>

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
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'hsl(var(--text-muted))' }}>Already registered?</span>{' '}
          <Link href="/login" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700 }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
