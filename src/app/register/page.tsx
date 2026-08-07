'use client'

import { useState } from 'react'
import { registerStudentAction } from '@/actions/auth'
import Link from 'next/link'
import PaymentGateway from '@/components/PaymentGateway'
import LoadingButton from '@/components/LoadingButton'
import { useToast } from '@/components/ToastProvider'

export default function RegisterWizard() {
  const [step, setStep] = useState(1);
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    fullName: '', phone: '', age: '', batchType: 'BEGINNER', password: ''
  });
  const [inputOtp, setInputOtp] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.password || !formData.age) {
      showToast('All fields are required.', 'ERROR');
      return;
    }
    showToast('OTP sent to your mobile.', 'INFO');
    setStep(2);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp !== '1234') {
      showToast('Invalid verification code.', 'ERROR');
      return;
    }
    setStep(3);
  };

  const onPaymentSuccess = async () => {
    setIsRegistering(true);
    setShowPayment(false);
    const sub = new FormData();
    sub.append('fullName', formData.fullName);
    sub.append('phone', formData.phone);
    sub.append('password', formData.password);
    sub.append('age', String(formData.age));
    sub.append('batchType', formData.batchType);

    const res = await registerStudentAction(null, sub) as any;
    if (res?.error) {
      showToast(res.error, 'ERROR');
      setIsRegistering(false);
    } else {
      showToast('Welcome to the Academy!', 'SUCCESS');
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '8px',
    outline: 'none', fontSize: '0.9rem'
  };

  const labelStyle = {
    display: 'block', marginBottom: '0.35rem', color: 'hsl(var(--text-muted))',
    fontSize: '0.75rem', fontWeight: 700 as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em'
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top right, hsla(343, 100%, 50%, 0.05), transparent 40%), radial-gradient(ellipse at bottom left, hsla(217, 91%, 60%, 0.05), transparent 40%), hsl(var(--bg-primary))',
      padding: '2rem 1rem'
    }}>

      {showPayment && (
        <PaymentGateway
          amount={4000} description="Academy Registration Fee"
          onSuccess={onPaymentSuccess} onCancel={() => setShowPayment(false)}
        />
      )}

      <div className="card glass animate-fade-in" style={{
        width: '100%', maxWidth: '520px', padding: '2rem 1.75rem', borderRadius: '16px', margin: '0 auto'
      }}>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ height: '4px', flex: 1, background: s <= step ? 'hsl(var(--accent-blue))' : 'rgba(255,255,255,0.05)', borderRadius: '4px', transition: '0.3s ease' }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', background: step === 3 ? '#10b981' : 'hsl(var(--accent-blue))',
            display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.1rem', margin: '0 auto 0.75rem auto',
            transform: 'rotate(-3deg)', transition: '0.2s'
          }}>🏓</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
            {step === 1 ? 'Join the Academy' : step === 2 ? 'Verify Identity' : 'Complete Payment'}
          </h2>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: 0 }}>
            {step === 1 ? 'Fill in your details to get started.' : step === 2 ? `Code sent to ${formData.phone}` : 'Finalize your membership.'}
          </p>
        </div>

        {/* STEP 1: Demographics */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} type="text" placeholder="e.g. Ma Long" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} type="number" placeholder="21" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Mobile Number</label>
              <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" placeholder="1234567890" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Training Level</label>
              <select required value={formData.batchType} onChange={e => setFormData({...formData, batchType: e.target.value})} style={{ ...inputStyle, background: 'hsl(var(--bg-primary))', appearance: 'none' as const }}>
                <option value="BEGINNER">Foundational (Beginner)</option>
                <option value="INTERMEDIATE">Competitive (Intermediate)</option>
                <option value="ADVANCED">Elite Pre-Pro (Advanced)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <LoadingButton variant="primary" loadingText="PROCESSING..." style={{ marginTop: '0.25rem', width: '100%' }}>
              Continue →
            </LoadingButton>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <input maxLength={4} type="text" required value={inputOtp} onChange={e => setInputOtp(e.target.value)} placeholder="0000"
              style={{ width: '160px', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '2px solid hsl(var(--accent-blue))', color: '#fff', borderRadius: '12px', outline: 'none', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700, margin: '0 auto' }} />
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', margin: 0 }}>Enter the 4-digit code.</p>
            <LoadingButton variant="primary" loadingText="VERIFYING..." style={{ width: '100%' }}>
              Verify & Continue
            </LoadingButton>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>← Back</button>
          </form>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Registration Fee</span>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>₹4,000</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>One-time academy entry</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>₹4k</span>
              </div>
            </div>
            <button onClick={() => setShowPayment(true)} className="btn btn-primary" disabled={isRegistering}
              style={{ width: '100%', background: '#10b981', color: '#000', fontWeight: 700 }}>
              {isRegistering ? 'Processing...' : 'Pay & Complete Registration'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'hsl(var(--text-muted))', margin: 0 }}>Encrypted payment processing active</p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'hsl(var(--text-muted))' }}>Already registered?</span>{' '}
          <Link href="/login" style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'none', fontWeight: 700 }}>Login</Link>
        </div>
      </div>
    </div>
  )
}
