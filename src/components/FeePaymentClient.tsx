'use client'

import { useState } from 'react'
import PaymentGateway from './PaymentGateway'
import { updateFeeStatusAction } from '@/actions/fees'
import { useToast } from './ToastProvider'

export function FeePaymentClient({ feeId, amount, currentStatus }: { feeId: string; amount: number; currentStatus: string }) {
  const [showGateway, setShowGateway] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const { showToast } = useToast()

  const handleSuccess = async () => {
    const result = await updateFeeStatusAction(feeId, 'PAID')
    if (result.success) {
      setStatus('PAID')
      showToast('Payment quantum synchronized successfully.', 'SUCCESS')
    } else {
      showToast(result.error || 'Synchronization failed.', 'ERROR')
    }
  }

  if (status === 'PAID' || currentStatus === 'PAID') {
    return (
      <div className="card glass animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
         <div style={{ 
           width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.1)', 
           color: '#10b981', borderRadius: '50%', display: 'grid', placeItems: 'center', 
           fontSize: '2rem', margin: '0 auto 1.5rem auto' 
         }}>✅</div>
         <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginBottom: '0.5rem' }}>Transaction Verified</h3>
         <p style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
            Your academy credentials have been updated for this cycle.
         </p>
      </div>
    )
  }

  return (
    <>
      <button 
        onClick={() => setShowGateway(true)}
        className="btn btn-primary"
        style={{ 
          width: '100%', padding: '1.25rem', background: '#10b981', 
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)', fontSize: '1.1rem' 
        }}
      >
        <span>⚡</span> Initialize Secure Payment
      </button>

      {showGateway && (
        <PaymentGateway 
          amount={amount}
          description="Academy Strategic Enrollment Fee"
          onSuccess={handleSuccess}
          onCancel={() => setShowGateway(false)}
          redirectPath="/student"
        />
      )}
    </>
  )
}
