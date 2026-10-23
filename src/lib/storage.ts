import fs from 'fs/promises'
import path from 'path'

export interface SaveFileParams {
  storageKey: string
  buffer: Buffer
  mimeType: string
}

export interface StoredFileResult {
  fileUrl: string
}

/**
 * Storage adapter handling file uploads.
 * Writes to public/uploads in standard Node environments,
 * and handles read-only serverless filesystems gracefully.
 */
export async function saveUploadedFile(params: SaveFileParams): Promise<StoredFileResult> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  try {
    await fs.mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, params.storageKey)
    await fs.writeFile(filePath, params.buffer)
    return { fileUrl: `/uploads/${params.storageKey}` }
  } catch (err: unknown) {
    // If the filesystem is read-only (e.g. Vercel serverless functions without cloud bucket)
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.warn('[STORAGE] Local disk write failed, fallback handling:', errorMsg)

    // In serverless environments, store as a base64 Data URL if under 2MB, or throw a clear error
    if (params.buffer.length <= 2 * 1024 * 1024) {
      const base64 = params.buffer.toString('base64')
      return { fileUrl: `data:${params.mimeType};base64,${base64}` }
    }

    throw new Error('Storage service unavailable: persistent uploads require configured cloud storage in this environment.')
  }
}
