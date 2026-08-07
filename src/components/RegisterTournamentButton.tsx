'use client'

import { useState, useTransition } from 'react'
import { registerForTournamentAction } from '@/actions/admin'
import { useToast } from './ToastProvider'
import PaymentGateway from './PaymentGateway'

export default function RegisterTournamentButton({ 
  tournamentId, 
  studentId, 
  entryFee, 
  isRegistered: initialRegistered 
}: { 
  tournamentId: string, 
  studentId: string, 
  entryFee: number,
  isRegistered: boolean
}) {
  const [isRegistered, setIsRegistered] = useState(initialRegistered)
  const [showGateway, setShowGateway] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const handlePaymentSuccess = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('tournamentId', tournamentId)
      formData.append('studentId', studentId)
      formData.append('amountPaid', entryFee.toString())
      
      const result = await registerForTournamentAction(null, formData)
      if (result.success) {
        setIsRegistered(true)
        showToast('Tournament entry authorized and synchronized.', 'SUCCESS')
        setShowGateway(false)
      } else {
        showToast(result.error || 'Identity verification failed after payment.', 'ERROR')
      }
    })
  }

  if (isRegistered) {
    return (
      <button disabled className="btn btn-secondary" style={{ width: '100%', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: '#10b981', fontWeight: 900, cursor: 'default', opacity: 1 }}>
        ✓ Authorized Entry
      </button>
    )
  }

  return (
    <>
      <button 
        onClick={() => setShowGateway(true)}
        disabled={isPending}
        className="btn btn-primary"
        style={{ 
          width: '100%', background: 'hsl(var(--accent-blue))', 
          boxShadow: '0 20px 40px var(--accent-blue-glow)',
          fontSize: '1rem', padding: '1.25rem'
        }}
      >
        {isPending ? 'Processing Nexus...' : `Register for ₹${entryFee.toLocaleString('en-IN')}`}
      </button>

      {showGateway && (
        <PaymentGateway 
          amount={entryFee}
          description="Tournament Operational Entry Fee"
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowGateway(false)}
          redirectPath="/student/tournaments"
        />
      )}
    </>
  )
}
