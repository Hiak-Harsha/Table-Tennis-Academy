import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-guard'
import { getPrivateFile } from '@/lib/storage'
import { detectMagicBytes } from '@/lib/file-security'

export const dynamic = 'force-dynamic'

interface RouteProps {
  params: Promise<{ key: string }>
}

/**
 * Protected File Access Route.
 * Verifies session authentication before serving private chat attachments or receipts.
 * Strictly prevents public unauthenticated access to private student media.
 */
export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to access private attachments' },
        { status: 401 }
      )
    }

    const { key } = await params
    const file = await getPrivateFile(key)

    if (!file) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    const detected = detectMagicBytes(file.buffer)
    const mimeType = detected?.mimeType || 'application/octet-stream'

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-transform, max-age=3600',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve file'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
