import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service & Rules | Table Tennis Academy',
  description: 'Academy Membership Terms, Code of Conduct, Training Rules, and Dispute Resolution for Table Tennis Academy.',
}

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'hsl(var(--bg-primary))', color: 'hsl(var(--text-primary))', padding: '2rem 1rem', width: '100%', boxSizing: 'border-box' }}>
      <main id="main-content" style={{ maxWidth: '800px', margin: '0 auto', background: 'hsl(var(--bg-card))', padding: '2rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            color: 'hsl(var(--accent-blue))',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          ← Back to Academy Home
        </Link>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#fff' }}>
          Terms of Service & Rules
        </h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '2rem' }}>
          Effective Date: October 2026 | Governing Academy Regulations & Athlete Agreement
        </p>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>1. Membership & Enrollment</h2>
          <p>
            Enrolling at Table Tennis Academy constitutes acceptance of these operational regulations. Each athlete is assigned a
            unique Student ID and curriculum batch (Foundational, Competitive Edge, or Elite/Pro) determined by the coaching staff.
          </p>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>2. Academy Fee Schedules</h2>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Training fees are billed in Indian Rupees (INR) and are due on the designated monthly or quarterly cycle date.</li>
            <li>Invoices are issued automatically with dynamic UPI QR codes and online payment deep links.</li>
            <li>Failure to clear fee dues within 15 calendar days of the due date may result in temporary suspension from training sessions.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>3. Code of Conduct & Court Rules</h2>
          <p>
            Athletes and visitors must uphold the highest standards of sportsmanship, discipline, and respect:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Non-marking indoor sports shoes are strictly mandatory on all rubber playing surfaces.</li>
            <li>ITTF-approved equipment must be handled with appropriate care; willful damage to academy tables or gear will incur repair charges.</li>
            <li>Bullying, unsportsmanlike conduct, or disruptive behavior will lead to immediate disciplinary review and possible suspension.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>4. Physical Activity & Liability Waiver</h2>
          <p>
            Table tennis is a high-intensity sport involving rapid reflexes and cardiovascular exertion. Enrollees acknowledge that:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Athletes participate in drills, fitness circuits, and matches voluntarily.</li>
            <li>Guardians must disclose any relevant medical conditions to ensure coach awareness.</li>
            <li>The academy maintains basic first-aid protocols, but is not liable for incidental sports injuries incurred during active play.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>5. Contact Information</h2>
          <p>
            Questions regarding terms, rules, or disciplinary appeals should be directed to{' '}
            <strong style={{ color: '#fff' }}>legal@tta-academy.com</strong> or in person at the academy desk.
          </p>
        </section>
      </main>
    </div>
  )
}
