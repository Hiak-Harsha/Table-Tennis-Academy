'use client'

import { useEffect, useState } from 'react'

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // 1. Register Service Worker in browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope)
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err)
        })
    }

    // 2. Capture 'beforeinstallprompt' event for custom install banner
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Check if user dismissed recently
      const dismissed = sessionStorage.getItem('tta_pwa_dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log('[PWA] Install prompt outcome:', outcome)
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    sessionStorage.setItem('tta_pwa_dismissed', '1')
  }

  if (!showInstallBanner) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '440px',
        margin: '0 auto',
        zIndex: 9998,
        background: 'rgba(18, 18, 22, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>📱</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Install TTA App</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Fast access, offline mode & instant push alerts
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={handleInstall}
          className="btn btn-primary"
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', background: '#10b981', color: '#000', fontWeight: 800 }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'hsl(var(--text-muted))',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
