'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentProps {
  amount: number
  description: string
  onSuccess: () => void
  onCancel: () => void
  redirectPath?: string
}

export default function PaymentGateway({ amount, description, onSuccess, onCancel, redirectPath }: PaymentProps) {
  const router = useRouter()
  const [step, setStep] = useState<'CHOICE' | 'UPI' | 'QR' | 'CARD' | 'BANK' | 'PROCESSING' | 'SUCCESS'>('CHOICE')
  const [timeLeft, setTimeLeft] = useState(300)
  const [upiId, setUpiId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  useEffect(() => {
    if (step === 'QR' || step === 'UPI' || step === 'CARD') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const handleProcess = () => {
    setStep('PROCESSING')
    setTimeout(() => {
      setStep('SUCCESS')
      setTimeout(() => {
        onSuccess()
        if (redirectPath) {
          router.push(redirectPath)
          router.refresh()
        }
      }, 1500)
    }, 2500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
      padding: '1.5rem', animation: 'fadeIn 0.4s ease'
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '440px',
        borderRadius: '24px', overflow: 'hidden',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#fff'
      }}>
        {/* Header */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: 0 }}>Nexus Payment Portal</h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '0.2rem 0 0 0' }}>Secure Academy Protocol</p>
          </div>
          <div style={{ 
            padding: '0.6rem 1rem', background: 'hsl(var(--accent-blue-glow))', 
            border: '1px solid hsl(var(--accent-blue))', borderRadius: '12px', 
            color: 'hsl(var(--accent-blue))', fontWeight: 900, fontSize: '1.2rem' 
          }}>
            ₹{amount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2.5rem' }}>
          {step === 'CHOICE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <p style={{ fontSize: '0.95rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>Select your authenticated method:</p>
               <button onClick={() => setStep('QR')} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'all 0.3s' }}>
                 <span style={{ fontSize: '1.8rem' }}>📲</span>
                 <div style={{ textAlign: 'left' }}>
                   <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Unified UPI QR</div>
                   <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>GPay, PhonePe, Sync</div>
                 </div>
               </button>
               <button onClick={() => setStep('CARD')} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'all 0.3s' }}>
                 <span style={{ fontSize: '1.8rem' }}>💳</span>
                 <div style={{ textAlign: 'left' }}>
                   <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Credit/Debit Link</div>
                   <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Visa, MC, Rupay</div>
                 </div>
               </button>
               <button onClick={() => setStep('BANK')} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'all 0.3s' }}>
                 <span style={{ fontSize: '1.8rem' }}>🏛️</span>
                 <div style={{ textAlign: 'left' }}>
                   <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Net Banking Sync</div>
                   <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Direct Academy Gateway</div>
                 </div>
               </button>
               <button onClick={onCancel} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'hsl(var(--accent-red))', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content', margin: '0 auto' }}>Cancel Operation</button>
            </div>
          )}

          {step === 'QR' && (
            <div style={{ textAlign: 'center' }}>
               <div style={{ padding: '2rem', background: '#fff', borderRadius: '24px', display: 'inline-block', marginBottom: '2rem', boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
                 <img src="/images/qr_placeholder.png" alt="Payment QR" style={{ width: '100%', maxWidth: '200px', height: 'auto', display: 'block' }} />
               </div>
               <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 800, marginBottom: '0.5rem' }}>Synchronizing with Mobile Apps</div>
               <div style={{ fontSize: '0.85rem', color: 'hsl(var(--accent-red))', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session Expires: {formatTime(timeLeft)}</div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2.5rem' }}>
                 <button onClick={() => setStep('CHOICE')} className="btn btn-secondary">Previous</button>
                 <button onClick={handleProcess} className="btn btn-primary" style={{ background: '#10b981', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>Simulate Verification</button>
               </div>
            </div>
          )}

          {step === 'CARD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Card Number</label>
                 <input type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'hsl(var(--bg-primary))', border: '1px solid var(--border-subtle)', color: '#fff', outline: 'none' }} />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div>
                   <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Expiry</label>
                   <input type="text" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'hsl(var(--bg-primary))', border: '1px solid var(--border-subtle)', color: '#fff', outline: 'none' }} />
                 </div>
                 <div>
                   <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>CVV</label>
                   <input type="password" placeholder="***" value={cardCvv} onChange={e => setCardCvv(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'hsl(var(--bg-primary))', border: '1px solid var(--border-subtle)', color: '#fff', outline: 'none' }} />
                 </div>
               </div>
               <button onClick={handleProcess} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', marginTop: '1rem' }}>Initiate Authorization</button>
               <button onClick={() => setStep('CHOICE')} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Switch Method</button>
            </div>
          )}

          {step === 'BANK' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>Select your preferred financial institution:</p>
               {['HDFC Bank Protocol', 'ICICI Direct Sync', 'SBI Nexus', 'Axis Financial'].map(bank => (
                 <button key={bank} onClick={handleProcess} className="card" style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: 800 }}>{bank}</div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Direct API Integration</div>
                 </button>
               ))}
               <button onClick={() => setStep('CHOICE')} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', marginTop: '1rem' }}>Switch Method</button>
            </div>
          )}

          {step === 'PROCESSING' && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
               <div style={{ 
                 width: '70px', height: '70px', border: '4px solid rgba(255,255,255,0.05)', 
                 borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', 
                 animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite', margin: '0 auto 2rem auto' 
               }}></div>
               <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>Processing</h3>
               <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1rem' }}>Verifying quantum on secure nodes...</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
               <div style={{ 
                 width: '100px', height: '100px', background: 'rgba(16,185,129,0.1)', 
                 color: '#10b981', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', 
                 display: 'grid', placeItems: 'center', fontSize: '3rem', 
                 margin: '0 auto 2rem auto', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
               }}>✓</div>
               <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginBottom: '0.5rem' }}>Authorized</h2>
               <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem' }}>Standard 1.5s Redirection Active</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 800, letterSpacing: '0.05em' }}>
          🛡️ ENCRYPTED SYNC • PCI-CERTIFIED • TTA SECURE
        </div>
      </div>
    </div>
  )
}
