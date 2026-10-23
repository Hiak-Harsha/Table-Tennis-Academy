import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed script in production environment!')
  }

  console.log('🌱 Starting database seed (development/test only)...')

  // 1. Establish initial development system admin
  const adminUser = await prisma.user.upsert({
    where: { phone: 'admin' },
    update: {},
    create: {
      phone: 'admin',
      passwordHash: 'adminadmin',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created/verified:', adminUser.phone)

  // 2. Establish test student User
  const studentUser = await prisma.user.upsert({
    where: { phone: '1234567890' },
    update: {},
    create: {
      phone: '1234567890',
      passwordHash: 'password',
      role: 'STUDENT',
    },
  })

  // 3. Connect Student Profile
  const studentProfile = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      studentId: 'TTA-0892',
      fullName: 'Alex Johnson',
      age: 20,
      batchType: 'ADVANCED',
      enrollmentStatus: 'ACTIVE',
      contactDetails: 'alex@example.com',
      bio: 'Competitive tournament player specializing in offensive topspin rallies.',
    },
  })

  console.log('✅ Student profile created/verified:', studentProfile.studentId)

  // 4. Connect sample Academy Fee
  const fee = await prisma.academyFee.upsert({
    where: { id: 'seed-fee-001' },
    update: {},
    create: {
      id: 'seed-fee-001',
      studentId: studentProfile.id,
      amount: 250000, // ₹2,500 in Paise
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'DUE',
      interval: 'MONTHLY',
    },
  })

  console.log('✅ Sample academy fee created:', fee.id)

  // 5. Connect sample Tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'seed-tourney-001' },
    update: {},
    create: {
      id: 'seed-tourney-001',
      name: 'State Ranking Championship 2026',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      venue: 'National Sports Arena, Court 4',
      level: 'INTERMEDIATE',
      entryFee: 75000, // ₹750 in Paise
      eligibilityCriteria: 'Intermediate or Advanced ranking athletes under 25 years.',
    },
  })

  console.log('✅ Sample tournament created:', tournament.name)
  console.log('✨ Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
