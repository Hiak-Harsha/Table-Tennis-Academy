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
    <div className="animate-fade-in nexus-container" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Link href="/admin/students" style={{ 
              textDecoration: 'none', color: 'hsl(var(--text-muted))', 
              fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' 
            }}>
              ← Roster Analytics
            </Link>
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.15rem' }}>Edit Athlete</h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem' }}>
             Strategic management of <span style={{ color: '#fff', fontWeight: 800 }}>{student.fullName}</span>'s academy record.
          </p>
        </div>
        <div style={{ 
          padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', 
          border: '1px solid var(--border-subtle)', borderRadius: '12px', textAlign: 'right' 
        }}>
           <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Protocol ID</div>
           <code style={{ fontSize: '1.1rem', color: 'hsl(var(--accent-blue))', fontWeight: 900 }}>{student.studentId}</code>
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
