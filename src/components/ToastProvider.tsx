'use client'

import { useState, createContext, useContext, useCallback, useMemo } from 'react'

type ToastType = 'SUCCESS' | 'ERROR' | 'INFO'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'INFO') => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const contextValue = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div 
        aria-live="polite"
        style={{ 
          position: 'fixed', 
          bottom: '1.5rem', 
          right: '1rem', 
          maxWidth: 'calc(100vw - 2rem)',
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        {toasts.map(t => (
          <div key={t.id} className="glass animate-fade-in" style={{ 
            padding: '0.85rem 1.25rem', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '100%',
            borderLeft: `4px solid ${t.type === 'SUCCESS' ? '#10b981' : t.type === 'ERROR' ? '#ef4444' : '#3b82f6'}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            wordBreak: 'break-word'
          }}>
            <span style={{ fontSize: '1.1rem' }}>
              {t.type === 'SUCCESS' ? '✅' : t.type === 'ERROR' ? '❌' : 'ℹ️'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
