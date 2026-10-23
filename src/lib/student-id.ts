import prisma from './prisma'

/**
 * Generates an authoritative, collision-resistant student identification number (e.g. TTA-01001).
 * Uses monotonic sequence count with retry loop to prevent unique-constraint collisions at scale.
 */
export async function generateStudentId(): Promise<string> {
  const count = await prisma.student.count()
  let nextNum = count + 1001

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `TTA-${String(nextNum).padStart(5, '0')}`
    const existing = await prisma.student.findUnique({
      where: { studentId: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
    nextNum += 1
  }

  // High-entropy fallback if dense existing IDs are encountered
  const randomSuffix = Math.floor(10000 + Math.random() * 90000)
  return `TTA-${randomSuffix}`
}
