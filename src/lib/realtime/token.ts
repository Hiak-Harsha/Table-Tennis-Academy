import { SignJWT, jwtVerify } from 'jose'

export interface RealtimeTokenPayload {
  sub: string // userId
  role: string
  channels: string[]
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'development-insecure-secret-key-at-least-32-chars-long-do-not-use-in-prod'
  return new TextEncoder().encode(secret)
}

/**
 * Signs a channel capability token for realtime subscribers (e.g. Ably/Pusher/Supabase or SSE).
 */
export async function signRealtimeToken(payload: RealtimeTokenPayload, ttlSeconds = 3600): Promise<string> {
  const secretKey = getSecretKey()
  return new SignJWT({
    role: payload.role,
    channels: payload.channels,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey)
}

/**
 * Cryptographically verifies a channel capability token.
 */
export async function verifyRealtimeToken(token: string): Promise<RealtimeTokenPayload | null> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey)
    return {
      sub: payload.sub as string,
      role: payload.role as string,
      channels: payload.channels as string[],
    }
  } catch {
    return null
  }
}
