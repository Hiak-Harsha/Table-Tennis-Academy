'use client'

import { useFormStatus } from 'react-dom'

export function PayFeeButton() {
  const { pending } = useFormStatus()
  
  return (
    <button className="btn btn-primary" style={{ padding: '1rem 3rem', opacity: pending ? 0.7 : 1 }} disabled={pending}>
      {pending ? 'Processing Securely...' : 'Pay Online Now'}
    </button>
  )
}
