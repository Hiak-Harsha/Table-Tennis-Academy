import prisma from '@/lib/prisma'
import StudentRosterClient from '@/components/StudentRosterClient'

export default async function AdminStudents() {
  const students = await prisma.student.findMany({ orderBy: { fullName: 'asc' } })

  return (
    <div style={{ padding: '0 0.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.2rem' }}>Student Roster</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.75rem' }}>
          Manage all registered athletes in the academy.
        </p>
      </div>
      <StudentRosterClient students={students as any} />
    </div>
  )
}
