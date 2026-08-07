'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Nav */}
      <nav style={{ background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)', position: 'fixed', top: 0, width: '100%', zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '68px' }}>
          {/* Logo */}
          <Link href="/home" style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-red)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '1rem', borderRadius: '6px' }}>🏓</div>
            TTA Elite
          </Link>
          {/* Nav Links */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1.75rem', fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <a href="#about" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>Facility</a>
              <a href="#programs" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>Programs</a>
              <a href="#contact" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>Contact</a>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/register" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Apply Now</Link>
              <Link href="/login" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '68px' }}>
        <div className="img-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
          <img src="/images/hero.png" alt="Elite Table Tennis" className="img-contain" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '750px' }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 700, letterSpacing: '4px', display: 'block', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>
              State's Premier Training Base
            </span>
            <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', lineHeight: 0.95, textShadow: '0 8px 30px rgba(0,0,0,0.7)', marginBottom: '0.75rem' }}>
              Master<br />The Spin.
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#e4e4e7', maxWidth: '520px', marginBottom: '1.5rem', textShadow: '0 3px 8px rgba(0,0,0,0.5)', lineHeight: 1.5 }}>
              Stop playing ping-pong. Start training like a professional athlete. Elite ITTF tables, national-tier coaching, and real match analytics.
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              {/* Enroll Now → goes to registration, not login */}
              <Link href="/register" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}>
                Enroll Now — Free Trial
              </Link>
              <a href="#about" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}>
                Explore Facility
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section style={{ background: 'var(--accent-red)', padding: '2rem 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[['16', 'ITTF Tables'], ['8+', 'Certified Coaches'], ['200+', 'Active Athletes'], ['3x', 'State Champions']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{num}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Facility Section */}
      <section id="about" style={{ background: '#0d0d0d' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '600px' }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src="/images/academy.png" alt="Facility" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to left, #0d0d0d 0%, transparent 30%)' }}></div>
          </div>
          <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 700, letterSpacing: '3px', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Our Facility</span>
            <h2 style={{ fontSize: '2.25rem', color: '#fff', marginBottom: '1rem', lineHeight: 1.1 }}>State-Of-The-Art Arena.</h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '1rem' }}>
              16 premium Butterfly Centrefold tables on Gerflor Taraflex sports flooring, illuminated by 1,200 lux shadow-less LED tournament lighting.
            </p>
            <p style={{ color: '#94a3b8', marginBottom: '2.5rem', fontSize: '1rem' }}>
              We track biomechanics. Record matches in 4K. Analyze stroke path logic using integrated smart-camera systems.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Student Portal login */}
              <Link href="/login" className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>Student Portal</Link>
              {/* Admin access — goes to login where admin tab exists */}
              <Link href="/login" className="btn btn-secondary" style={{ padding: '0.875rem 2rem' }}>Admin Access</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" style={{ padding: '4rem 0', background: '#000' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 700, letterSpacing: '3px', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>Curriculum</span>
            <h2 style={{ fontSize: '2.25rem', color: '#fff' }}>Overtake The Competition</h2>
            <p style={{ maxWidth: '500px', margin: '0 auto', color: '#64748b' }}>Three structured pathways — each designed to fast-track your performance at every level.</p>
          </div>

          <div className="grid-3">
            {/* Card 1 — Enroll goes to /register?batch=BEGINNER */}
            <div className="card" style={{ borderTop: '4px solid #3b82f6', background: '#090909' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', opacity: 0.2, marginBottom: '-0.5rem' }}>01</div>
              <h3 style={{ color: '#fff', marginBottom: '0.75rem' }}>Foundational</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Master the grip, footwork, and biomechanical posture needed for unshakeable strokes from day one.</p>
              <Link href="/register" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', borderColor: '#3b82f6', color: '#3b82f6' }}>
                Enroll Now →
              </Link>
            </div>

            {/* Card 2 — Enroll goes to /register?batch=INTERMEDIATE */}
            <div className="card" style={{ borderTop: '4px solid var(--accent-red)', background: '#090909' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-red)', opacity: 0.2, marginBottom: '-0.5rem' }}>02</div>
              <h3 style={{ color: '#fff', marginBottom: '0.75rem' }}>Competitive Edge</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Third-ball attacks, disguised serves, and high-speed counter-looping for tournament-ready players.</p>
              <Link href="/register" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Enroll Now →
              </Link>
            </div>

            {/* Card 3 — Apply goes to /register?batch=ADVANCED */}
            <div className="card" style={{ borderTop: '4px solid #fff', background: '#090909' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', opacity: 0.15, marginBottom: '-0.5rem' }}>03</div>
              <h3 style={{ color: '#fff', marginBottom: '0.75rem' }}>Elite Pre-Pro</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>National-tier sparring, sports psychology, and competitive resilience for serious competitors.</p>
              <Link href="/register" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                Apply for Screening →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" style={{ padding: '4rem 0', background: '#050505', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Ready to Compete?</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1rem' }}>Join the best athletes. Spots limited.</p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '0.9rem' }}>Apply</Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.75rem 2.5rem', fontSize: '0.9rem' }}>Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#050505', padding: '1.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 600 }}>© 2025 TTA ELITE ACADEMY. Built for Champions.</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/register" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Enroll</Link>
            <Link href="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Student Login</Link>
            <Link href="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Admin</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
