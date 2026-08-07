'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireAny } from '@/lib/auth-utils'
import { z } from 'zod'

const FeeSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.preprocess((v) => Number(v), z.number().min(1, 'Amount must be positive')),
  dueDate: z.string().transform(v => new Date(v)),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']).default('MONTHLY')
})

export async function addFeeAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()
    
    const validated = FeeSchema.parse({
      studentId: formData.get('studentId'),
      amount: formData.get('amount'),
      dueDate: formData.get('dueDate'),
      interval: formData.get('interval')
    })

    await prisma.academyFee.create({
      data: {
        studentId: validated.studentId,
        amount: validated.amount,
        dueDate: validated.dueDate,
        status: 'DUE',
        interval: validated.interval
      }
    })

    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')
    return { success: `Fee of ₹${validated.amount} added.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Operation failed' }
  }
}

export async function updateFeeStatusAction(feeId: string, status: string) {
  try {
    const session = await requireAny()
    
    // Safety check: a student can only mark their OWN fee as PAID (via gateway flow)
    if (session.role === 'STUDENT') {
      const targetFee = await prisma.academyFee.findUnique({ where: { id: feeId } })
      if (!targetFee || targetFee.studentId !== session.studentId) {
        return { error: 'Unauthorized: Cannot modify external fee record.' }
      }
      if (status !== 'PAID') return { error: 'Vulnerability: Invalid status transition for student.' }
    }

    await prisma.academyFee.update({
      where: { id: feeId },
      data: {
        status,
        paymentDate: status === 'PAID' ? new Date() : null,
      }
    })
    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Status update failed.' }
  }
}
