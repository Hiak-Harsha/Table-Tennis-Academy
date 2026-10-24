import prisma from './prisma'

/**
 * Generates an authoritative, collision-resistant student identification number (e.g. TTA-01001).
 * Uses monotonic sequence with gap detection to ensure consistent 5-digit zero-padded format.
 */
export async function generateStudentId(txClient?: any): Promise<string> {
  const client = txClient || prisma

  const count = await client.student.count()
  let nextNum = count + 1001

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `TTA-${String(nextNum).padStart(5, '0')}`
    const existing = await client.student.findUnique({
      where: { studentId: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
    nextNum += 1
  }

  // Consistent sequential fallback based on maximum existing ID
  const latestStudent = await client.student.findFirst({
    where: { studentId: { startsWith: 'TTA-' } },
    orderBy: { studentId: 'desc' },
    select: { studentId: true },
  })

  if (latestStudent?.studentId) {
    const match = latestStudent.studentId.match(/TTA-(\d+)/)
    if (match) {
      const highest = parseInt(match[1], 10)
      return `TTA-${String(highest + 1).padStart(5, '0')}`
    }
  }

  return 'TTA-01001'
}
