'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-guard'
import { rupeesToPaise, formatINR } from '@/lib/currency'
import { FeeSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

export async function addFeeAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin()

    const validated = FeeSchema.parse({
      studentId: formData.get('studentId'),
      amount: formData.get('amount'),
      dueDate: formData.get('dueDate'),
      interval: formData.get('interval'),
    })

    const amountInPaise = rupeesToPaise(validated.amount)

    await prisma.academyFee.create({
      data: {
        studentId: validated.studentId,
        amount: amountInPaise,
        dueDate: validated.dueDate,
        status: 'DUE',
        interval: validated.interval,
      },
    })

    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')
    return { success: `Fee of ${formatINR(amountInPaise)} added.` }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message }
    return { error: error.message || 'Operation failed' }
  }
}

export async function updateFeeStatusAction(feeId: string, status: string) {
  try {
    const admin = await requireAdmin()

    await prisma.academyFee.update({
      where: { id: feeId },
      data: {
        status,
        paymentDate: status === 'PAID' ? new Date() : null,
      },
    })

    await writeAuditLog({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'FEE_STATUS_MANUALLY_UPDATED',
      entity: 'AcademyFee',
      entityId: feeId,
      details: { newStatus: status },
    })

    revalidatePath('/admin/fees')
    revalidatePath('/student/fees')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Status update failed.' }
  }
}
