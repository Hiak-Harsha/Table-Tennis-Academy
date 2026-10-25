import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Server Action Authorization Coverage (Finding D)', () => {
  const actionsDir = path.join(process.cwd(), 'src', 'actions')
  const actionFiles = fs.readdirSync(actionsDir).filter((f) => f.endsWith('.ts'))

  // Explicitly audited public auth actions (login, registration, forgot-password, OTP challenges)
  const PUBLIC_AUTH_ACTIONS = new Set([
    'unifiedLoginAction',
    'registerStudentAction',
    'requestOtpAction',
    'verifyOtpAction',
    'requestPasswordResetAction',
    'resetPasswordAction',
    'logoutAction',
  ])

  // Known authentication guard patterns
  const AUTH_GUARDS = [
    'requireAuth',
    'requireStudent',
    'requireAdmin',
    'requireRole',
    'requireRoleOrRedirect',
    'getCurrentUser',
    'validateSession',
    'verifySessionToken',
  ]

  it('verifies every action file has "use server" directive at the top', () => {
    for (const file of actionFiles) {
      const content = fs.readFileSync(path.join(actionsDir, file), 'utf8')
      const firstLines = content.split('\n').slice(0, 5).join('\n')
      expect(firstLines).toContain("'use server'")
    }
  })

  it('enforces that every exported server action calls an authoritative auth guard or is an audited public auth flow', () => {
    const discoveredActions: Array<{ file: string; actionName: string; isGuarded: boolean; isPublicAuth: boolean }> = []

    for (const file of actionFiles) {
      const content = fs.readFileSync(path.join(actionsDir, file), 'utf8')
      // Find all exported async functions: export async function name(...)
      const regex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g
      let match: RegExpExecArray | null

      while ((match = regex.exec(content)) !== null) {
        const actionName = match[1]
        const startIndex = match.index

        // Extract function body up to next function or end
        const remaining = content.slice(startIndex)
        const nextExport = remaining.slice(1).search(/export\s+async\s+function/)
        const functionBody = nextExport > 0 ? remaining.slice(0, nextExport) : remaining

        const hasAuthGuard = AUTH_GUARDS.some((guard) => functionBody.includes(guard))
        const isPublicAuth = PUBLIC_AUTH_ACTIONS.has(actionName)

        discoveredActions.push({
          file,
          actionName,
          isGuarded: hasAuthGuard,
          isPublicAuth,
        })
      }
    }

    // Expect at least 15 server actions discovered across the system
    expect(discoveredActions.length).toBeGreaterThanOrEqual(15)

    // Fail if any discovered action is neither guarded nor in the public auth allowlist
    const unguarded = discoveredActions.filter((a) => !a.isGuarded && !a.isPublicAuth)

    if (unguarded.length > 0) {
      const list = unguarded.map((u) => `${u.file}: ${u.actionName}`).join(', ')
      throw new Error(`Unguarded server action(s) discovered lacking authentication check: ${list}`)
    }

    expect(unguarded).toHaveLength(0)
  })
})
