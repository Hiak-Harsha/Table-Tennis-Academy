import prisma from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/auth-guard'
import StudentRosterClient from '@/components/StudentRosterClient'

export const dynamic = 'force-dynamic'

export default async function AdminStudents() {
  await requireRoleOrRedirect(['ADMIN'])
  const students = await prisma.student.findMany({ orderBy: { fullName: 'asc' } })

  return (
    <div style={{ padding: '0 0.5rem', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Student Roster</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.8rem' }}>
          Manage all registered athletes in the academy.
        </p>
      </div>
      <StudentRosterClient students={students as any} />
    </div>
  )
}
