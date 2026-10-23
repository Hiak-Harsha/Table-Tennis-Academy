import Link from 'next/link'

export const metadata = {
  title: 'Refund & Cancellation Policy | Table Tennis Academy',
  description: 'Fee Refund Guidelines, Tournament Withdrawal Windows, and Cancellation Rules for Table Tennis Academy.',
}

export default function RefundPolicyPage() {
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
          Refund & Cancellation Policy
        </h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '2rem' }}>
          Effective Date: October 2026 | Transparent Financial & Tournament Withdrawal Guidelines
        </p>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>1. Monthly Academy Training Fees</h2>
          <p>
            Monthly and quarterly coaching fees fund reserved court capacity, coaching staff allocations, and training equipment.
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Advance Notice:</strong> Cancellation requests submitted at least 7 days before the start of a billing cycle are eligible for a 100% refund or credit carry-forward.</li>
            <li><strong>Partial Usage:</strong> Once a monthly training batch has commenced, coaching fees are non-refundable for that billing cycle.</li>
            <li><strong>Medical Exceptions:</strong> In the event of documented sports injuries or medical conditions requiring extended cessation of play (&gt; 2 weeks), athletes may freeze their subscription or request a pro-rata credit upon submitting a physician certificate.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>2. Tournament Entry Fees</h2>
          <p>
            Sanctioned circuit tournaments feature strict bracket seeding and participant limits:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Withdrawal before Registration Deadline:</strong> Full (100%) refund processed back to the original payment source.</li>
            <li><strong>Withdrawal after Fixtures / Draw Published:</strong> Entry fees are non-refundable as tournament draws, court allocations, and prize pools are locked.</li>
            <li><strong>Academy Event Cancellation:</strong> If a tournament is cancelled or rescheduled by TTA due to weather or operational grounds, participants receive an immediate full refund or complimentary registration into the rescheduled event.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>3. Refund Processing & Timelines</h2>
          <p>
            All approved refunds are credited back to the original payment method:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>UPI & Netbanking:</strong> 2 to 4 business days.</li>
            <li><strong>Credit & Debit Cards:</strong> 5 to 7 business days, depending on issuing bank settlement cycles.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.9rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent-red))', marginBottom: '0.5rem' }}>4. Dispute Resolution & Help</h2>
          <p>
            For billing inquiries, receipt copies, or refund claims, please email{' '}
            <strong style={{ color: '#fff' }}>accounts@tta-academy.com</strong> with your Student ID and transaction reference number.
          </p>
        </section>
      </main>
    </div>
  )
}
