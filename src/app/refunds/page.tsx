import Link from 'next/link'

export const metadata = {
  title: 'Refund & Cancellation Policy | Table Tennis Academy',
  description: 'Fee refund terms, tournament cancellation windows, and settlement timelines for Table Tennis Academy.',
}

export default function RefundPolicyPage() {
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
          Refund & Cancellation Policy
        </h1>
        <p style={{ color: 'var(--net-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Standard Operational Guidelines | All Amounts in INR
        </p>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>1. Monthly Academy Training Fees</h2>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Monthly academy coaching fees are non-refundable once the billing month has commenced.</li>
            <li>For quarterly or annual advance payments, a pro-rated refund (excluding the current active month) may be approved upon written notice accompanied by a verified medical certificate.</li>
            <li>Unattended sessions due to personal scheduling or travel cannot be credited or refunded, but make-up sessions may be arranged subject to coach table availability.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>2. Tournament Entry Fees</h2>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Full Refund:</strong> If cancellation is requested 48 hours or more prior to the scheduled draw and fixture publication date.</li>
            <li><strong>Non-Refundable:</strong> Once tournament fixtures/brackets have been officially drawn, entry fees are non-refundable due to referee scheduling and tournament quota allocations.</li>
            <li><strong>Tournament Cancellation:</strong> If an academy tournament is cancelled or postponed by organizers due to unforeseen facility maintenance or weather, 100% of entry fees will be refunded automatically.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>3. Refund Processing & Timelines</h2>
          <p>
            Approved refunds are credited back to the original payment source (UPI VPA or Bank Account).
            Standard bank processing timelines apply:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>UPI Transactions:</strong> 2 to 4 business days.</li>
            <li><strong>Net Banking / Debit:</strong> 5 to 7 business days.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>4. Dispute Resolution & Help</h2>
          <p>
            If you encounter duplicate charges, failed webhook confirmations, or payment discrepancies, please contact our financial desk with your UPI Reference Number / Transaction ID at{' '}
            <strong style={{ color: 'var(--net-white)' }}>billing@tta-academy.com</strong>.
          </p>
        </section>
      </main>
    </div>
  )
}
