'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function IntroAnimation() {
  const router = useRouter()
  const [phase, setPhase] = useState<'enter' | 'text' | 'exit' | 'done'>('enter')
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show the intro once per browser session
    const seen = sessionStorage.getItem('tta_intro_seen')
    if (seen) {
      router.replace('/home')
      return
    }
    sessionStorage.setItem('tta_intro_seen', '1')
    setShow(true)

    const t1 = setTimeout(() => setPhase('text'), 800)
    const t2 = setTimeout(() => setPhase('exit'), 2800)
    const t3 = setTimeout(() => {
      setPhase('done')
      router.replace('/home')
    }, 3600)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [router])

  if (!show || phase === 'done') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.8s ease' : 'none',
        overflow: 'hidden'
      }}
    >
      {/* Pulsing red glow */}
      <div style={{
        position: 'absolute',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(225,29,72,0.25) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} className="animate-intro-pulse" />

      {/* Floating orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${6 + i * 3}px`,
            height: `${6 + i * 3}px`,
            borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.08)',
            left: `${8 + i * 11}%`,
            top: `${15 + (i % 4) * 20}%`,
          }} className="animate-float-orb" />
        ))}
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 1, textAlign: 'center',
        opacity: phase === 'enter' ? 0 : 1,
        transform: phase === 'enter' ? 'scale(0.88)' : 'scale(1)',
        transition: 'opacity 0.55s ease, transform 0.55s ease'
      }}>
        <div style={{
          fontSize: '5rem', marginBottom: '1.25rem', display: 'inline-block',
        }} className={phase !== 'enter' ? "animate-spin-in" : ""}>🏓</div>

        <div style={{ fontWeight: 900, fontSize: '4.5rem', letterSpacing: '-0.04em', color: '#fff', lineHeight: 1, marginBottom: '0.5rem' }}>
          TTA <span style={{ color: '#e11d48' }}>ELITE</span>
        </div>

        <div style={{
          fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.45em',
          color: '#475569', textTransform: 'uppercase', marginBottom: '2.5rem',
          opacity: phase === 'text' || phase === 'exit' ? 1 : 0,
          transform: phase === 'text' || phase === 'exit' ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s'
        }}>
          Table Tennis Academy
        </div>

        {/* Progress bar */}
        <div style={{
          width: '180px', height: '2px', background: 'rgba(255,255,255,0.07)',
          borderRadius: '1px', margin: '0 auto', overflow: 'hidden',
          opacity: phase === 'text' ? 1 : 0, transition: 'opacity 0.3s ease'
        }}>
          <div style={{
            height: '100%',
            borderRadius: '1px',
            background: 'linear-gradient(90deg, #e11d48, #7c3aed)',
          }} className={phase === 'text' ? "animate-load-bar" : ""} />
        </div>
      </div>

    </div>
  )
}
