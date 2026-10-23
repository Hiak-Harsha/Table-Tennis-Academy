'use client'

import { useState } from 'react'
import { useToast } from './ToastProvider'
import PaymentGateway from './PaymentGateway'
import { formatINR } from '@/lib/currency'
import { registerForTournamentAction } from '@/actions/tournaments'

export default function RegisterTournamentButton({
  tournamentId,
  studentId: _studentId,
  entryFee,
  isRegistered: initialRegistered,
}: {
  tournamentId: string
  studentId: string
  entryFee: number
  isRegistered: boolean
}) {
  const [isRegistered, setIsRegistered] = useState(initialRegistered)
  const [showGateway, setShowGateway] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handlePaymentSuccess = () => {
    setIsRegistered(true)
    showToast('Tournament entry confirmed and paid.', 'SUCCESS')
    setShowGateway(false)
  }

  const handleFreeRegistration = async () => {
    setLoading(true)
    try {
      const res = await registerForTournamentAction(tournamentId)
      if (res.success) {
        setIsRegistered(true)
        showToast(res.success, 'SUCCESS')
      } else {
        showToast(res.error || 'Registration failed.', 'ERROR')
      }
    } catch {
      showToast('Registration failed.', 'ERROR')
    } finally {
      setLoading(false)
    }
  }

  if (isRegistered) {
    return (
      <button
        disabled
        className="btn btn-secondary"
        style={{
          width: '100%',
          border: '1px solid #10b981',
          background: 'rgba(16,185,129,0.05)',
          color: '#10b981',
          fontWeight: 900,
          cursor: 'default',
          opacity: 1,
        }}
      >
        ✓ Registered
      </button>
    )
  }

  return (
    <>
      <button
        disabled={loading}
        onClick={entryFee === 0 ? handleFreeRegistration : () => setShowGateway(true)}
        className="btn btn-primary"
        style={{
          width: '100%',
          background: 'hsl(var(--accent-blue))',
          boxShadow: '0 20px 40px var(--accent-blue-glow)',
          fontSize: '1rem',
          padding: '1.25rem',
        }}
      >
        {loading
          ? 'Confirming Entry...'
          : entryFee === 0
          ? 'Free Entry — Register Now'
          : `Register for ${formatINR(entryFee)}`}
      </button>

      {showGateway && (
        <PaymentGateway
          amount={entryFee}
          purpose="TOURNAMENT"
          targetId={tournamentId}
          description="Tournament Entry Fee"
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowGateway(false)}
          redirectPath="/student/tournaments"
        />
      )}
    </>
  )
}
