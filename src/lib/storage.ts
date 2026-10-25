import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface SaveFileParams {
  storageKey: string
  buffer: Buffer
  mimeType: string
}

export interface StoredFileResult {
  fileUrl: string
  storageKey: string
}

const PRIVATE_STORAGE_DIR = path.join(process.cwd(), 'storage', 'private_uploads')

/**
 * Authoritative private file storage adapter.
 * Generates unguessable cryptographic keys, writes to private local storage
 * (or cloud object storage), and generates authenticated access URLs (/api/uploads/:key).
 * Strictly forbids public world-readable access and base64-in-database fallbacks.
 */
export async function saveUploadedFile(params: SaveFileParams): Promise<StoredFileResult> {
  const ext = path.extname(params.storageKey)
  const randomKey = `${crypto.randomBytes(16).toString('hex')}${ext}`

  try {
    await fs.mkdir(PRIVATE_STORAGE_DIR, { recursive: true })
    const destinationPath = path.join(PRIVATE_STORAGE_DIR, randomKey)

    // Security: Prevent path traversal
    if (!destinationPath.startsWith(PRIVATE_STORAGE_DIR)) {
      throw new Error('Invalid storage destination path')
    }

    await fs.writeFile(destinationPath, params.buffer)

    return {
      fileUrl: `/api/uploads/${randomKey}`,
      storageKey: randomKey,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[STORAGE ERROR] Failed to save file:', errorMsg)
    throw new Error('Failed to persist file in secure object storage. Please try again.')
  }
}

/**
 * Retrieves a file from secure private storage.
 */
export async function getPrivateFile(key: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  const sanitizedKey = path.basename(key)
  const filePath = path.join(PRIVATE_STORAGE_DIR, sanitizedKey)

  if (!filePath.startsWith(PRIVATE_STORAGE_DIR)) {
    return null
  }

  try {
    const buffer = await fs.readFile(filePath)
    return { buffer, fileName: sanitizedKey }
  } catch {
    return null
  }
}
