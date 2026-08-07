'use client'

import { useFormStatus } from 'react-dom'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export default function LoadingButton({ 
  loadingText = 'Processing...', 
  children, 
  variant = 'primary',
  className = '',
  ...props 
}: LoadingButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`btn btn-${variant} ${className}`}
      style={{
        ...props.style,
        position: 'relative',
        minWidth: '120px'
      }}
    >
      {pending ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="animate-spin" style={{ 
            width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', 
            borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' 
          }}></span>
          {loadingText}
        </div>
      ) : children}
    </button>
  )
}
