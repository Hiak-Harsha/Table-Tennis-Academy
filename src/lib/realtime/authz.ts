export interface SubscriptionContext {
  userId: string
  role: 'ADMIN' | 'STUDENT'
  studentId?: string | null
  internalStudentId?: string | null
  batchType?: string | null
}

/**
 * Authoritatively verifies whether a user session is permitted to subscribe to a given channel.
 * Prevents unauthorized listening to private direct messages, batch chats, or administrative operations.
 */
export function authorizeChannelSubscription(
  context: SubscriptionContext,
  channel: string
): boolean {
  if (!channel || typeof channel !== 'string') return false

  // Global channel is open to all authenticated users
  if (channel === 'global') {
    return true
  }

  // Admin operations channel is strictly restricted to ADMIN role
  if (channel === 'admin:ops') {
    return context.role === 'ADMIN'
  }

  // Batch channel: 'batch:BEGINNER', 'batch:INTERMEDIATE', 'batch:ADVANCED'
  if (channel.startsWith('batch:')) {
    if (context.role === 'ADMIN') return true
    const requestedBatch = channel.slice(6)
    return Boolean(context.batchType && context.batchType.toUpperCase() === requestedBatch.toUpperCase())
  }

  // Personal user channel: 'user:<userId>'
  if (channel.startsWith('user:')) {
    if (context.role === 'ADMIN') return true
    const targetUserId = channel.slice(5)
    return context.userId === targetUserId
  }

  // Direct message channel: 'dm:<idA>:<idB>'
  if (channel.startsWith('dm:')) {
    if (context.role === 'ADMIN') return true
    const parts = channel.slice(3).split(':')
    if (parts.length !== 2) return false

    const [idA, idB] = parts
    const myIds = [context.userId, context.studentId, context.internalStudentId].filter(Boolean)

    return myIds.some((id) => id === idA || id === idB)
  }

  return false
}

/**
 * Creates canonical direct message channel name with lexicographically sorted IDs.
 */
export function getDmChannelName(userA: string, userB: string): string {
  const sorted = [userA, userB].sort()
  return `dm:${sorted[0]}:${sorted[1]}`
}
