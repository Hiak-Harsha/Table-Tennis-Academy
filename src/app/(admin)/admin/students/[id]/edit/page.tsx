import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditStudentForm from '@/components/EditStudentForm'
import Link from 'next/link'

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true }
  })

  if (!student) {
    notFound()
  }

  return (
    <div className="animate-fade-in academy-container" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <nav aria-label="Breadcrumb" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
            <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0, alignItems: 'center' }}>
              <li>
                <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>Coach Desk</Link>
              </li>
              <li style={{ color: '#64748b' }}>/</li>
              <li>
                <Link href="/admin/students" style={{ color: '#94a3b8', textDecoration: 'none' }}>Player Roster</Link>
              </li>
              <li style={{ color: '#64748b' }}>/</li>
              <li aria-current="page" style={{ color: '#fff', fontWeight: 600 }}>{student.fullName}</li>
            </ol>
          </nav>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.15rem' }}>Edit Player Profile</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Manage coach assignment, training squad tier, and enrollment status for <span style={{ color: '#fff', fontWeight: 800 }}>{student.fullName}</span>.
          </p>
        </div>
        <div style={{ 
          padding: '0.65rem 1.25rem', background: 'rgba(255,255,255,0.03)', 
          border: '1px solid var(--paddle-border)', borderRadius: '12px', textAlign: 'right' 
        }}>
           <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Player ID</div>
           <code className="scoreboard-digits" style={{ fontSize: '1.2rem', color: 'var(--ball-orange)', fontWeight: 800 }}>{student.studentId}</code>
        </div>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <div className="card glass" style={{ padding: '3rem', borderRadius: '32px' }}>
          <EditStudentForm student={student} />
        </div>
      </div>
    </div>
  )
}
