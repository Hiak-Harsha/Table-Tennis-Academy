const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    // Test raw SQL to check and add the column
    const result = await prisma.$queryRawUnsafe(`PRAGMA table_info(Student)`)
    const cols = result.map(r => r.name)
    console.log('Current columns:', cols.join(', '))

    if (!cols.includes('enrollmentStatus')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Student ADD COLUMN enrollmentStatus TEXT NOT NULL DEFAULT 'ACTIVE'`)
      console.log('✅ Column enrollmentStatus added successfully!')
    } else {
      console.log('✅ Column already exists - no migration needed.')
    }
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
