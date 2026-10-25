import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { saveUploadedFile, getPrivateFile } from '@/lib/storage'
import { GET as getUploadHandler } from '@/app/api/uploads/[key]/route'

vi.mock('@/lib/auth-guard', () => ({
  getCurrentUser: vi.fn(),
}))

describe('Secure Private Storage & Authenticated File Access (Finding D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists file in private storage and generates authenticated /api/uploads/ URL', async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    const result = await saveUploadedFile({
      storageKey: 'profile.png',
      buffer: pngHeader,
      mimeType: 'image/png',
    })

    expect(result.fileUrl).toMatch(/^\/api\/uploads\/[a-f0-9]+\.png$/)
    expect(result.storageKey).toMatch(/^[a-f0-9]+\.png$/)

    // Verify it is retrievable
    const retrieved = await getPrivateFile(result.storageKey)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.buffer).toEqual(pngHeader)
  })

  it('rejects unauthenticated requests to /api/uploads/:key with status 401', async () => {
    const { getCurrentUser } = await import('@/lib/auth-guard')
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/uploads/sample.png')
    const res = await getUploadHandler(req, { params: Promise.resolve({ key: 'sample.png' }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/Authentication required/i)
  })

  it('serves file with nosniff and correct MIME type for authenticated users', async () => {
    const { getCurrentUser } = await import('@/lib/auth-guard')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1', role: 'STUDENT' } as any)

    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    const saved = await saveUploadedFile({
      storageKey: 'attachment.png',
      buffer: pngHeader,
      mimeType: 'image/png',
    })

    const req = new NextRequest(`http://localhost/api/uploads/${saved.storageKey}`)
    const res = await getUploadHandler(req, { params: Promise.resolve({ key: saved.storageKey }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
