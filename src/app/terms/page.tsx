import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Table Tennis Academy',
  description: 'Academy Rules, Membership Terms, and Tournament Guidelines for Table Tennis Academy.',
}

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paddle-black)', color: 'var(--net-white)', padding: '2rem 1.5rem' }}>
      <main id="main-content" style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            color: 'var(--ball-orange)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          ← Back to Academy Home
        </Link>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginBottom: '0.5rem', color: '#fff' }}>
          Terms of Service & Academy Rules
        </h1>
        <p style={{ color: 'var(--net-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Effective: October 2026 | Table Tennis Academy Operations
        </p>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>1. Membership & Enrollment</h2>
          <p>
            Enrollment in Table Tennis Academy grants players scheduled access to coaching sessions, equipment tables, and sanctioned academy tournaments.
            Membership is contingent upon adherence to court rules, coaching staff directives, and timely fee fulfillment.
          </p>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>2. Academy Fee Schedules</h2>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Monthly academy dues are billed in Indian Rupees (INR) and are payable on or before the 1st of each calendar month.</li>
            <li>Invoices remaining unpaid past the 15th of the month enter &apos;OVERDUE&apos; status, generating automated reminders to the player/guardian.</li>
            <li>Extended non-payment exceeding 30 days may result in temporary suspension of academy training access until dues are cleared.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>3. Code of Conduct & Court Rules</h2>
          <p>
            All athletes, coaches, and visitors must uphold the highest standards of sportsmanship:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Non-marking sports shoes must be worn on Taraflex court flooring at all times.</li>
            <li>Damaging tables, nets, or academy barriers intentionally is strictly prohibited and subject to replacement cost.</li>
            <li>Abusive language, bullying, or unsportsmanlike behavior toward referees, coaches, or opponents results in immediate disciplinary review.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>4. Physical Activity & Liability Waiver</h2>
          <p>
            Table tennis involves strenuous physical exertion, fast multi-directional movement, and cardio conditioning.
            Players and guardians acknowledge that participation is voluntary and confirm the athlete is medically fit for athletic training.
            The academy maintains first-aid facilities on site; emergency medical attention will be coordinated immediately in the event of an injury.
          </p>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>5. Contact Information</h2>
          <p>
            For questions regarding academy terms or membership contracts, contact the Coach Desk at{' '}
            <strong style={{ color: 'var(--net-white)' }}>admin@tta-academy.com</strong>.
          </p>
        </section>
      </main>
    </div>
  )
}
