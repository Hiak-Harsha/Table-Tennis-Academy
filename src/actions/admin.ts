'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAny } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation Schemas
const StudentSchema = z.object({
  name: z.string().min(2, 'Full name required'),
  batch: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  age: z.preprocess((v) => Number(v), z.number().min(5).max(70)),
  phone: z.string().regex(/^\d{10}$/, '10-digit phone number required'),
  password: z.string().min(6, 'Security Threshold: Password must be 6+ characters.'),
  coachName: z.string().optional(),
  contactDetails: z.string().optional()
})

const TournamentSchema = z.object({
  name: z.string().min(3),
  venue: z.string().min(3),
  level: z.string(),
  entryFee: z.preprocess((v) => Number(v), z.number().min(0)),
  date: z.string().transform(v => new Date(v)),
  eligibility: z.string().optional()
})

export async function createStudentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    // Validate inputs
    const validated = StudentSchema.parse({
      name: formData.get('name'),
      batch: formData.get('batch'),
      age: formData.get('age'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      coachName: formData.get('coachName'),
      contactDetails: formData.get('contactDetails')
    })

    const studentIdStr = 'TTA-' + Math.floor(1000 + Math.random() * 9000);

    const existing = await prisma.user.findUnique({ where: { phone: validated.phone } })
    if (existing) return { error: `Phone number ${validated.phone} is already registered.` }

    await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          phone: validated.phone,
          passwordHash: validated.password,
          role: 'STUDENT'
        }
      })

      await tx.student.create({
        data: {
          studentId: studentIdStr,
          userId: newUser.id,
          fullName: validated.name,
          age: validated.age,
          batchType: validated.batch,
          coachName: validated.coachName || null,
          contactDetails: validated.contactDetails || null,
          enrollmentStatus: 'ACTIVE'
        }
      })
    })

    revalidatePath('/admin/students')
    revalidatePath('/admin')
    return { success: `✓ ${validated.name} registered as ${studentIdStr}.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Registration failed. Please check all fields and try again.' }
  }
}

export async function updateStudentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    const id = formData.get('id') as string;
    const validated = StudentSchema.partial().parse({
      name: formData.get('fullName'),
      batch: formData.get('batchType'),
      age: formData.get('age'),
      coachName: formData.get('coachName'),
      contactDetails: formData.get('contactDetails')
    })
    const enrollmentStatus = formData.get('enrollmentStatus') as string;

    await prisma.student.update({
      where: { id },
      data: { 
        fullName: validated.name, 
        batchType: validated.batch, 
        age: validated.age,
        coachName: validated.coachName || null,
        contactDetails: validated.contactDetails || null,
        enrollmentStatus
      }
    });

    revalidatePath('/admin/students');
    revalidatePath('/admin');
    return { success: 'Student profile updated successfully.' };
  } catch(error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: `Update failed: ${error?.message || 'Unknown error'}` };
  }
}

export async function broadcastNotificationAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    const message = formData.get('message') as string;
    const title = formData.get('title') as string || 'General Announcement';
    const category = formData.get('category') as string || 'GENERAL';

    if (!message) return { error: 'Broadcast payload cannot be empty.' };

    await prisma.broadcast.create({
      data: { title, message, category, author: 'Academy HQ' }
    });

    const allUsers = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    const notifications = allUsers.map((u: any) => ({
      userId: u.id,
      type: 'GENERAL',
      message: `${title}: ${message.substring(0, 50)}...`
    }));

    await prisma.notification.createMany({ data: notifications });
    
    revalidatePath('/student');
    return { success: `Broadcasted to Academy Hub and ${allUsers.length} athletes.` };
  } catch (error: any) {
    return { error: error.message || 'Broadcast Protocol Failed' };
  }
}

export async function createTournamentAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    const validated = TournamentSchema.parse({
      name: formData.get('name'),
      venue: formData.get('venue'),
      level: formData.get('level'),
      entryFee: formData.get('entryFee'),
      date: formData.get('date'),
      eligibility: formData.get('eligibility')
    })

    await prisma.tournament.create({
      data: {
        name: validated.name,
        venue: validated.venue,
        level: validated.level,
        entryFee: validated.entryFee,
        eligibilityCriteria: validated.eligibility || null,
        date: validated.date
      }
    });

    revalidatePath('/admin/tournaments');
    revalidatePath('/student/tournaments');
    return { success: `Tournament "${validated.name}" published.` };
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Failed to create tournament.' };
  }
}

export async function registerForTournamentAction(prevState: any, formData: FormData) {
  try {
    const session = await requireAny()
    
    const tournamentId = formData.get('tournamentId') as string;
    const studentId = formData.get('studentId') as string;
    const amountPaid = parseFloat(formData.get('amountPaid') as string);

    // Security: Only allow student to register for themselves
    if (session.role === 'STUDENT' && session.studentId !== studentId) {
      return { error: 'Vulnerability Detected: Identity mismatch during registration.' }
    }

    if (!tournamentId || !studentId || !amountPaid) return { error: 'Missing registration parameters.' };

    await prisma.tournamentPayment.create({
      data: {
        tournamentId,
        studentId,
        amountPaid,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        confirmationDetails: `UPI_REF_${Math.floor(Math.random()*1000000)}`
      }
    });

    revalidatePath('/student/tournaments');
    return { success: 'Tournament registration successful!' };
  } catch (error: any) {
    return { error: error.message || 'Registration failed' };
  }
}
