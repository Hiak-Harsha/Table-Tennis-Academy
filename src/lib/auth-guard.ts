import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  SESSION_COOKIE_NAME,
  validateSession,
  AuthenticatedUser,
} from '@/lib/session'

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized: Authentication required.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden: Insufficient permissions.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export type AuthAction = 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'

/**
 * Get current authenticated user from session cookie (authoritative DB check)
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  return validateSession(token)
}

/**
 * Require any authenticated user or throw UnauthorizedError
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new UnauthorizedError('Unauthorized: Authentication required.')
  }
  return user
}

export const requireAny = requireAuth

/**
 * Require administrator role or throw ForbiddenError
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Forbidden: Administrator access required.')
  }
  return user
}

/**
 * Require active student athlete role or throw ForbiddenError.
 * If targetStudentId is provided, enforces athlete-self boundary.
 */
export async function requireStudent(targetStudentId?: string): Promise<
  AuthenticatedUser & { student: NonNullable<AuthenticatedUser['student']> }
> {
  const user = await requireAuth()

  if (user.role !== 'STUDENT') {
    throw new ForbiddenError('Forbidden: Student access required.')
  }

  if (!user.student || user.student.enrollmentStatus !== 'ACTIVE') {
    throw new ForbiddenError('Forbidden: Active student enrollment required.')
  }

  if (targetStudentId) {
    const isOwner =
      user.id === targetStudentId ||
      user.student.id === targetStudentId ||
      user.student.studentId === targetStudentId

    if (!isOwner) {
      throw new ForbiddenError('Forbidden: Cross-athlete access prohibited.')
    }
  }

  return user as AuthenticatedUser & { student: NonNullable<AuthenticatedUser['student']> }
}

/**
 * Require specific role or redirect (useful for RSC page components)
 */
export async function requireRoleOrRedirect(allowedRoles: ('ADMIN' | 'STUDENT')[]): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') redirect('/admin')
    else redirect('/student')
  }

  return user
}

/**
 * Central authorization matrix:
 * Evaluates whether an actor has permission to perform an action on a target resource.
 *
 * Matrix across roles {anon, student-self, student-other, admin} × {READ, WRITE, DELETE, ADMIN}:
 * - anon: all false
 * - student-self: READ (true), WRITE (true), DELETE (false), ADMIN (false)
 * - student-other: all false (unless unscoped resource where READ is true)
 * - admin: all true
 */
export function authorize(
  user: AuthenticatedUser | null,
  action: AuthAction,
  resourceOwnerId?: string
): boolean {
  if (!user) return false

  // Admins have universal authority across all resources and actions
  if (user.role === 'ADMIN') return true

  // Students
  if (user.role === 'STUDENT') {
    // Students can NEVER perform ADMIN or DELETE actions
    if (action === 'ADMIN' || action === 'DELETE') return false

    // If resource is not scoped to an owner (e.g. general read), allow READ
    if (!resourceOwnerId) {
      return action === 'READ'
    }

    // Check if user owns this resource
    const isOwner =
      user.id === resourceOwnerId ||
      user.student?.id === resourceOwnerId ||
      user.student?.studentId === resourceOwnerId

    if (isOwner) {
      return action === 'READ' || action === 'WRITE'
    }

    return false
  }

  return false
}
