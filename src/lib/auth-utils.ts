/**
 * Legacy compatibility facade for auth-utils.
 * All auth logic is delegated to the authoritative @/lib/auth-guard and @/lib/session modules.
 */
import {
  getCurrentUser,
  requireAdmin,
  requireStudent,
  requireAuth,
  requireAny,
  authorize,
  UnauthorizedError,
  ForbiddenError,
} from './auth-guard'
import { SESSION_COOKIE_NAME } from './session'

export {
  getCurrentUser,
  requireAdmin,
  requireStudent,
  requireAuth,
  requireAny,
  authorize,
  UnauthorizedError,
  ForbiddenError,
  SESSION_COOKIE_NAME,
}

// Backward-compatible alias
export const getSession = getCurrentUser
