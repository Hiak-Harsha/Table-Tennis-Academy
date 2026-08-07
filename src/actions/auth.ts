'use server'

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { NEXUS_SECRET, SESSION_COOKIE_NAME } from '@/lib/auth-constants'

const UnifiedLoginSchema = z.object({
  identifier: z.string().min(4, 'ID or phone signature too short.'),
  password: z.string().min(6, 'Security protocol requires 6+ characters.'),
  role: z.enum(['ADMIN', 'STUDENT'])
})

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full legal name required.'),
  phone: z.string().regex(/^\d{10}$/, '10-digit mobile identification required.'),
  password: z.string().min(6, 'Password security threshold not met (min 6).'),
  age: z.preprocess((v) => Number(v), z.number().min(5).max(70)),
  batchType: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
})

/**
 * Universal Base64 Helpers (Edge & Node Compatible)
 */
function encodeBase64(str: string): string {
  if (typeof btoa === 'function') return btoa(str)
  return Buffer.from(str, 'utf8').toString('base64')
}

/**
 * Unified Authentication Protocol
 * Standardizes the handshake for both Overseas and Athletes to prevent role-inversion bugs.
 */
export async function unifiedLoginAction(prevState: any, formData: FormData) {
  try {
    const validated = UnifiedLoginSchema.parse({
      identifier: formData.get('identifier'),
      password: formData.get('password'),
      role: formData.get('role')
    })

    let sessionInfo: any = null

    if (validated.role === 'ADMIN') {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', phone: validated.identifier }
      })

      if (!adminUser || adminUser.passwordHash !== validated.password) {
        return { error: 'Administrative security key mismatch or ID not found.' }
      }

      sessionInfo = { id: adminUser.id, role: 'ADMIN' }
      console.log(`[AUTH] Admin handshake success: ${adminUser.phone}`)
    } else {
      let student = await prisma.student.findUnique({
        where: { studentId: validated.identifier },
        include: { user: true }
      })

      if (!student) {
        const userWithStudent = await prisma.user.findUnique({
          where: { phone: validated.identifier },
          include: { studentAccess: true }
        })
        if (userWithStudent?.studentAccess) {
          student = { ...userWithStudent.studentAccess, user: userWithStudent } as any
        }
      }

      if (!student || student.user.passwordHash !== validated.password) {
        return { error: 'Athlete identity mismatch or password synchronization failed.' }
      }

      sessionInfo = {
        id: student.user.id,
        role: 'STUDENT',
        studentId: student.id,
        displayId: student.studentId
      }
      console.log(`[AUTH] Student handshake success: ${student.studentId}`)
    }

    // Secure Handshake Signing: Standardized for Edge-Compatibility
    const payload = JSON.stringify(sessionInfo)
    const sig = encodeBase64(payload + NEXUS_SECRET).substring(0, 10)
    const val = encodeBase64(JSON.stringify({ d: payload, s: sig }))

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, val, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 
    })

    if (validated.role === 'ADMIN') redirect('/admin')
    else redirect('/student')
    
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
    if (error.message?.includes('NEXT_REDIRECT')) throw error
    
    console.error('Unified Auth Handshake Failure:', error)
    return { error: 'Integrated authentication protocol failure.' }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect('/login')
}

export async function registerStudentAction(prevState: any, formData: FormData) {
  try {
    const validated = RegisterSchema.parse({
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      age: formData.get('age'),
      batchType: formData.get('batchType')
    })

    const existingUser = await prisma.user.findUnique({ where: { phone: validated.phone } })
    if (existingUser) return { error: 'Mobile identification already exists in academy records.' }

    const studentIdStr = 'TTA-' + Math.floor(1000 + Math.random() * 9000)

    let sessionData: any = null

    await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          phone: validated.phone,
          passwordHash: validated.password,
          role: 'STUDENT'
        }
      })

      const student = await tx.student.create({
        data: {
          studentId: studentIdStr,
          userId: newUser.id,
          fullName: validated.fullName,
          age: validated.age,
          batchType: validated.batchType,
          enrollmentStatus: 'ACTIVE'
        }
      })

      sessionData = {
        id: newUser.id,
        role: 'STUDENT',
        studentId: student.id,
        displayId: studentIdStr
      }
    })

    if (sessionData) {
      const payload = JSON.stringify(sessionData)
      const sig = encodeBase64(payload + NEXUS_SECRET).substring(0, 10)
      const val = encodeBase64(JSON.stringify({ d: payload, s: sig }))

      console.log(`[AUTH] Registration nexus sync success. Signed Identity: ${sig}`)

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, val, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 
      })
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    if (error.message.includes('NEXT_REDIRECT')) throw error
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('Registration Handshake Failure:', error)
    return { error: 'Integrated enrollment transaction failed.' }
  }
  redirect('/student?welcome=true')
}
