import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getVerifiedReceipt } from '@/lib/receipt'
import { formatINR } from '@/lib/currency'
import { formatDate } from '@/lib/date'

interface PageProps {
  params: Promise<{ receiptNo: string }>
}

export const dynamic = 'force-dynamic'

export default async function VerifyReceiptPage({ params }: PageProps) {
  const { receiptNo } = await params
  const receipt = await getVerifiedReceipt(receiptNo)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0E14',
        color: '#F5F7FA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Decorative Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#FF6A13',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Table Tennis Academy
            </span>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                margin: '0.25rem 0 0 0',
                color: '#fff',
              }}
            >
              Official Payment Receipt
            </h1>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#FF6A13',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.4rem',
            }}
          >
            🏓
          </div>
        </div>

        {receipt ? (
          <div>
            {/* Verification Status Badge */}
            <div
              style={{
                background: 'rgba(14, 122, 79, 0.15)',
                border: '1px solid #0E7A4F',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0E7A4F',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                  Authentic Verified Transaction
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Authoritative record validated against the Academy Ledger
                </div>
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Receipt Reference
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {receipt.receiptNo}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Payment Date
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                  {receipt.paymentDate ? formatDate(receipt.paymentDate) : 'Confirmed'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Athlete Name
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                  {receipt.studentName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Student ID
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {receipt.studentId}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Purpose / Item
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                  {receipt.itemTitle}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Payment Method
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                  {receipt.method}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Amount Paid
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FF6A13', marginTop: '0.2rem' }}>
                  {formatINR(receipt.amountPaise)}
                </div>
              </div>
            </div>

            {/* Footer Digital Seal */}
            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '1.5rem',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              <div>🔒 SECURE DIGITAL VERIFICATION • ACADEMY LEDGER HASH</div>
              {receipt.orderId && (
                <div style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}>
                  Order: {receipt.orderId}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#E5334B', marginBottom: '0.5rem' }}>
              Receipt Not Found
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: '360px', margin: '0 auto 1.5rem auto' }}>
              No official payment or registration record was found matching reference number{' '}
              <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{receiptNo}</strong>.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
