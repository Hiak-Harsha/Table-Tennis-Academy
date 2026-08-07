import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Establish initial system admin
  await prisma.user.upsert({
    where: { phone: 'admin' },
    update: {},
    create: {
      phone: 'admin',
      passwordHash: 'admin',
      role: 'ADMIN'
    }
  })

  // 2. Establish test student User
  const studentUser = await prisma.user.upsert({
    where: { phone: '1234567890' },
    update: {},
    create: {
      phone: '1234567890',
      passwordHash: 'pw',
      role: 'STUDENT'
    }
  })

  // 3. Connect logical Student Profile
  const studentProfile = await prisma.student.upsert({
    where: { studentId: 'TTA-0892' },
    update: {},
    create: {
      studentId: 'TTA-0892',
      userId: studentUser.id,
      fullName: 'Alex Johnson',
      age: 22,
      batchType: 'ADVANCED'
    }
  })

  // 4. Connect logical Academy Fee
  await prisma.academyFee.create({
    data: {
      studentId: studentProfile.id,
      amount: 150.00,
      dueDate: new Date(),
      status: 'DUE'
    }
  })

  console.log('Database strict persistence primed.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
