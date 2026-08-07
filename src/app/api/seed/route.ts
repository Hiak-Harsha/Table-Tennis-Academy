import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Establish initial system admin
    const adminUser = await prisma.user.upsert({
      where: { phone: 'admin' },
      update: {
        passwordHash: 'adminadmin',
        role: 'ADMIN'
      },
      create: {
        phone: 'admin',
        passwordHash: 'adminadmin',
        role: 'ADMIN'
      }
    })

    // 2. Establish test student User
    const studentUser = await prisma.user.upsert({
      where: { phone: '1234567890' },
      update: {
        passwordHash: 'password',
        role: 'STUDENT'
      },
      create: {
        phone: '1234567890',
        passwordHash: 'password',
        role: 'STUDENT'
      }
    })

    // 3. Connect logical Student Profile (Sync with schema.prisma)
    const studentProfile = await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: {
        fullName: 'Alex Johnson',
        age: 19,
        batchType: 'ADVANCED',
        studentId: 'TTA-0892'
      },
      create: {
        userId: studentUser.id,
        fullName: 'Alex Johnson',
        age: 19,
        batchType: 'ADVANCED',
        studentId: 'TTA-0892'
      }
    })

    // 4. Connect logical Academy Fee (Sync with schema.prisma)
    await prisma.academyFee.upsert({
      where: { id: 'demo-fee-892' },
      update: {
        amount: 2500,
        status: 'DUE',
        interval: 'MONTHLY',
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      },
      create: {
        id: 'demo-fee-892',
        studentId: studentProfile.id,
        amount: 2500,
        status: 'DUE',
        interval: 'MONTHLY',
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      }
    })

    // 5. Connect standard Tournament for testing
    await prisma.tournament.upsert({
      where: { id: 'demo-tourney-1' },
      update: {
        name: 'Nexus Open Championship',
        date: new Date(new Date().setDate(new Date().getDate() + 14)),
        venue: 'Sector 42 Arena',
        level: 'INTERMEDIATE',
        entryFee: 500
      },
      create: {
        id: 'demo-tourney-1',
        name: 'Nexus Open Championship',
        date: new Date(new Date().setDate(new Date().getDate() + 14)),
        venue: 'Sector 42 Arena',
        level: 'INTERMEDIATE',
        entryFee: 500
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Nexus Database synchronized with hardened protocols.',
      credentials: {
        admin: { id: 'admin', password: 'adminadmin' },
        student: { phone: '1234567890', password: 'password', id: 'TTA-0892' }
      }
    })
  } catch (error: any) {
    console.error('Database Sync Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Schema violation in persistence handshake.',
      details: error.message 
    }, { status: 500 })
  }
}
