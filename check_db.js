const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ include: { studentAccess: true } })
  console.log('--- SYSTEM USERS ---')
  users.forEach(u => {
    console.log(`- Phone: ${u.phone} | Role: ${u.role} | HasProfile: ${!!u.studentAccess}`)
    if (u.studentAccess) console.log(`  -> StudentId: ${u.studentAccess.studentId} | Name: ${u.studentAccess.fullName}`)
  })
  
  const students = await prisma.student.findMany()
  console.log('STUDENTS:', students.length)
  students.forEach(s => console.log(`- ${s.fullName} [${s.studentId}]`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
