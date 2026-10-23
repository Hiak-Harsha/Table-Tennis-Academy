import prisma from '@/lib/prisma'

export interface AuditLogInput {
  actorId?: string | null
  actorRole?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: Record<string, unknown> | null
  ipAddress?: string | null
}

/**
 * Write a non-blocking, structured audit log entry for security and compliance
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId || null,
        actorRole: input.actorRole || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.ipAddress || null,
      },
    })
  } catch (error) {
    // Audit failures should be logged but never crash core operational paths
    console.error('[AUDIT_ERROR] Failed to record audit entry:', error)
  }
}
