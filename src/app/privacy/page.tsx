import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Table Tennis Academy',
  description: 'Privacy Policy, Minor Student Data Handling, and Data Protection Practices for Table Tennis Academy.',
}

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--net-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Last Updated: October 2026 | Compliant with Digital Personal Data Protection (DPDP) Act & IT Act 2000
        </p>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>1. Overview & Scope</h2>
          <p>
            Table Tennis Academy (&quot;TTA&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting the privacy,
            dignity, and data rights of our athletes, coaches, and guardians. This Privacy Policy governs the collection, processing,
            and storage of personal data when using the TTA Portal and enrolling in training batches or sanctioned tournaments.
          </p>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>2. Minor Student Data Protection (Ages 5+)</h2>
          <p>
            We proudly coach athletes starting from age 5. In strict compliance with child data protection regulations:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Athletes under 18 years of age require explicit parental or legal guardian consent prior to enrollment.</li>
            <li>We capture and store guardian contact details (name and phone number) for all minor athletes for safety and coordination.</li>
            <li>Athlete data is never sold, leased, or shared with third-party advertisers or behavioral tracking services.</li>
            <li>Photographs or match recordings are published only with prior guardian consent.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>3. Information We Collect</h2>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li><strong>Athlete Identity:</strong> Full name, date of birth, age category, skill level, and profile photograph.</li>
            <li><strong>Contact Details:</strong> Verified 10-digit Indian mobile number, guardian phone number, and emergency contact.</li>
            <li><strong>Medical & Safety Notes:</strong> Optional allergies or medical conditions shared voluntarily for court safety.</li>
            <li><strong>Academy Records:</strong> Attendance logs, batch assignment, coach feedback, and tournament match records.</li>
            <li><strong>Financial Metadata:</strong> UPI transaction reference IDs, fee payment dates, and invoice receipts. (We never collect or store UPI PINs, bank account passwords, or debit/credit card numbers).</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>4. Payment Processing & Security</h2>
          <p>
            All online fee and tournament transactions are conducted through Reserve Bank of India (RBI) authorized payment aggregators
            and NPCI UPI rails. Transaction requests are cryptographically validated using HMAC-SHA256 webhooks and idempotency keys to prevent double-charging.
          </p>
        </section>

        <section style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--ball-orange)', marginBottom: '0.5rem' }}>5. Your Rights & Data Requests</h2>
          <p>
            Athletes and guardians hold full rights to access, download a digital export (CSV), rectify, or request permanent deletion of their personal records,
            subject to statutory legal or accounting retention obligations.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            To exercise your data protection rights, contact the Data Protection Officer at{' '}
            <strong style={{ color: 'var(--net-white)' }}>dpo@tta-academy.com</strong> or speak with the head coach at the academy desk.
          </p>
        </section>
      </main>
    </div>
  )
}
