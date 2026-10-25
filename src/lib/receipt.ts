import prisma from '@/lib/prisma'

export interface VerifiedReceipt {
  receiptNo: string
  studentName: string
  studentId: string
  batchType: string
  purpose: 'FEE' | 'TOURNAMENT' | 'PAYMENT'
  itemTitle: string
  amountPaise: number
  paymentDate: Date | null
  method: string
  orderId?: string
  paymentId?: string
  status: string
}

/**
 * Authoritatively verifies and resolves receipt details from the database.
 */
export async function getVerifiedReceipt(receiptNo: string): Promise<VerifiedReceipt | null> {
  const cleanReceiptNo = receiptNo.trim()
  if (!cleanReceiptNo) return null

  // 1. Check AcademyFee table
  const fee = await prisma.academyFee.findFirst({
    where: {
      OR: [
        { qrCodeHash: `VERIFIED_${cleanReceiptNo}` },
        { receiptUrl: `/receipts/${cleanReceiptNo}.pdf` },
        { receiptUrl: { contains: cleanReceiptNo } },
      ],
      status: 'PAID',
    },
    include: {
      student: true,
    },
  })

  if (fee && fee.student) {
    // Also fetch underlying payment record if available
    const payment = await prisma.payment.findFirst({
      where: {
        targetId: fee.id,
        purpose: 'FEE',
        status: 'CAPTURED',
      },
    })

    return {
      receiptNo: cleanReceiptNo,
      studentName: fee.student.fullName,
      studentId: fee.student.studentId,
      batchType: fee.student.batchType,
      purpose: 'FEE',
      itemTitle: `Academy Training Fee (${fee.interval})`,
      amountPaise: fee.amount,
      paymentDate: fee.paymentDate,
      method: fee.method || payment?.method || 'ONLINE',
      orderId: payment?.orderId,
      paymentId: payment?.paymentId || cleanReceiptNo,
      status: 'VERIFIED_PAID',
    }
  }

  // 2. Check TournamentPayment table
  const tournamentReg = await prisma.tournamentPayment.findFirst({
    where: {
      confirmationDetails: cleanReceiptNo,
      paymentStatus: 'PAID',
    },
    include: {
      student: true,
      tournament: true,
    },
  })

  if (tournamentReg && tournamentReg.student && tournamentReg.tournament) {
    const payment = await prisma.payment.findFirst({
      where: {
        studentId: tournamentReg.studentId,
        targetId: tournamentReg.tournamentId,
        purpose: 'TOURNAMENT',
        status: 'CAPTURED',
      },
    })

    return {
      receiptNo: cleanReceiptNo,
      studentName: tournamentReg.student.fullName,
      studentId: tournamentReg.student.studentId,
      batchType: tournamentReg.student.batchType,
      purpose: 'TOURNAMENT',
      itemTitle: `Tournament Entry: ${tournamentReg.tournament.name}`,
      amountPaise: tournamentReg.amountPaid,
      paymentDate: tournamentReg.paymentDate,
      method: payment?.method || 'ONLINE',
      orderId: payment?.orderId,
      paymentId: payment?.paymentId || cleanReceiptNo,
      status: 'VERIFIED_PAID',
    }
  }

  // 3. Fallback: Check Payment table directly
  const directPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { paymentId: cleanReceiptNo },
        { orderId: cleanReceiptNo },
      ],
      status: 'CAPTURED',
    },
    include: {
      student: true,
    },
  })

  if (directPayment && directPayment.student) {
    return {
      receiptNo: cleanReceiptNo,
      studentName: directPayment.student.fullName,
      studentId: directPayment.student.studentId,
      batchType: directPayment.student.batchType,
      purpose: (directPayment.purpose as any) || 'PAYMENT',
      itemTitle: `${directPayment.purpose} Payment`,
      amountPaise: directPayment.amount,
      paymentDate: directPayment.capturedAt,
      method: directPayment.method || 'ONLINE',
      orderId: directPayment.orderId,
      paymentId: directPayment.paymentId || cleanReceiptNo,
      status: 'VERIFIED_PAID',
    }
  }

  return null
}
