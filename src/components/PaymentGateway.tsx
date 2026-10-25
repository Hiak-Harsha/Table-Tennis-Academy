'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/currency'
import { createPaymentOrderAction, checkPaymentStatusAction } from '@/actions/payments'

interface PaymentProps {
  amount: number
  description: string
  purpose?: 'FEE' | 'TOURNAMENT'
  targetId?: string
  onSuccess: () => void
  onCancel: () => void
  redirectPath?: string
}

declare global {
  interface Window {
    Razorpay?: any
  }
}

export default function PaymentGateway({
  amount,
  description,
  purpose = 'FEE',
  targetId,
  onSuccess,
  onCancel,
  redirectPath,
}: PaymentProps) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [keyId, setKeyId] = useState<string | null>(null)
  const [upiIntent, setUpiIntent] = useState<string>('')
  const [status, setStatus] = useState<'AWAITING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('AWAITING')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes TTL
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Detect mobile device (touch primary pointer or user-agent)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches
      const mobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(coarsePointer || mobileAgent)
    }
  }, [])

  // Initialize authoritative order on server
  useEffect(() => {
    let mounted = true

    async function initOrder() {
      if (!targetId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const res = await createPaymentOrderAction({
        purpose,
        targetId,
      })

      if (!mounted) return

      if (res.success && res.orderId) {
        setOrderId(res.orderId)
        if (res.keyId) setKeyId(res.keyId)
        if (res.upiIntent) setUpiIntent(res.upiIntent)
        setLoading(false)
      } else {
        setErrorMessage(res.error || 'Failed to initialize payment gateway order.')
        setStatus('ERROR')
        setLoading(false)
      }
    }

    initOrder()

    return () => {
      mounted = false
    }
  }, [purpose, targetId])

  // Countdown timer for order session
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Authoritative server status polling: client NEVER sets status directly
  const checkStatus = useCallback(async () => {
    if (!orderId) return

    try {
      const res = await checkPaymentStatusAction(orderId)
      if (res.success && res.status === 'CAPTURED') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setStatus('SUCCESS')
        setTimeout(() => {
          onSuccess()
          if (redirectPath) {
            router.push(redirectPath)
            router.refresh()
          }
        }, 1500)
      }
    } catch {
      // Polling network glitch; continue next cycle
    }
  }, [orderId, onSuccess, redirectPath, router])

  useEffect(() => {
    if (orderId && status === 'AWAITING') {
      pollIntervalRef.current = setInterval(checkStatus, 2000)
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [orderId, status, checkStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Open official Razorpay Checkout modal if script loaded and keyId available
  const openRazorpayCheckout = () => {
    if (!orderId || !keyId || typeof window === 'undefined') return

    if (window.Razorpay) {
      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'Table Tennis Academy',
        description,
        order_id: orderId,
        handler: function () {
          setStatus('CONFIRMING')
          checkStatus()
        },
        theme: {
          color: '#FF6A13',
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    }
  }

  const qrImageUrl = upiIntent
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiIntent)}`
    : '/images/qr_placeholder.png'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-gateway-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass"
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 id="payment-gateway-title" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              TTA Payment Gateway
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '0.2rem 0 0 0' }}>
              {description}
            </p>
          </div>
          <div
            style={{
              padding: '0.6rem 1rem',
              background: 'hsl(var(--accent-blue-glow))',
              border: '1px solid hsl(var(--accent-blue))',
              borderRadius: '12px',
              color: 'hsl(var(--accent-blue))',
              fontWeight: 900,
              fontSize: '1.2rem',
            }}
          >
            {formatINR(amount)}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid rgba(255,255,255,0.1)',
                  borderTopColor: 'hsl(var(--accent-blue))',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1.5rem auto',
                }}
              />
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                Creating secure order session...
              </p>
            </div>
          )}

          {!loading && status === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
              <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Initialization Error</h4>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem' }}>
                {errorMessage}
              </p>
              <button onClick={onCancel} className="btn btn-secondary" style={{ width: '100%' }}>
                Close
              </button>
            </div>
          )}

          {!loading && status === 'CONFIRMING' && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid rgba(16, 185, 129, 0.1)',
                  borderTopColor: '#10b981',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1.5rem auto',
                }}
              />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Verifying with Bank
              </h3>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                Awaiting authoritative gateway webhook confirmation...
              </p>
            </div>
          )}

          {!loading && status === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  border: '2px solid rgba(16,185,129,0.3)',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '2.5rem',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginBottom: '0.5rem' }}>
                Payment Confirmed
              </h2>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                Authoritative transaction verified by bank
              </p>
            </div>
          )}

          {!loading && status === 'AWAITING' && (
            <div>
              {/* Mobile UPI Intent Button */}
              {isMobile && upiIntent && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <a
                    href={upiIntent}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      padding: '1.25rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      borderRadius: '16px',
                    }}
                  >
                    <span>⚡</span> Pay via UPI App (GPay / PhonePe / Paytm)
                  </a>
                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'hsl(var(--text-muted))',
                      marginTop: '0.75rem',
                    }}
                  >
                    Opens installed UPI application directly on your device
                  </p>
                </div>
              )}

              {/* Dynamic QR Code for Desktop or Mobile Secondary */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    padding: '1.25rem',
                    background: '#fff',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '1rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <Image
                    unoptimized
                    src={qrImageUrl}
                    alt="Authoritative UPI QR Code"
                    width={180}
                    height={180}
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>

                <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Scan to Pay with Any UPI App
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'hsl(var(--accent-red))',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Session Expires: {formatTime(timeLeft)}
                </div>

                {orderId && (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'hsl(var(--text-muted))',
                      fontFamily: 'monospace',
                      marginTop: '0.5rem',
                    }}
                  >
                    Order Ref: {orderId}
                  </div>
                )}

                {keyId && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={openRazorpayCheckout}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      💳 Pay with Card / Netbanking
                    </button>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'hsl(var(--text-muted))',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel Operation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.7rem',
            color: 'hsl(var(--text-muted))',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div>🔒 SERVER-VERIFIED WEBHOOK CONFIRMATION • NPCI UPI INTEGRATION</div>
          <div>
            <Link
              href="/refunds"
              target="_blank"
              style={{ color: 'hsl(var(--accent-blue))', textDecoration: 'underline' }}
            >
              Refund & Cancellation Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
