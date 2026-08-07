const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    // Find first student
    const student = await prisma.student.findFirst()
    if (!student) {
      console.log('No students in DB')
      return
    }
    console.log('Found student:', JSON.stringify(student, null, 2))

    // Try the exact update the action does
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        fullName: student.fullName,
        batchType: student.batchType,
        age: student.age,
        coachName: student.coachName || null,
        contactDetails: student.contactDetails || null,
        enrollmentStatus: student.enrollmentStatus || 'ACTIVE'
      }
    })
    console.log('✅ Update SUCCESS:', updated.fullName, '| Status:', updated.enrollmentStatus)
  } catch (e) {
    console.error('❌ Update FAILED:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
