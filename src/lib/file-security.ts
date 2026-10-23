import crypto from 'crypto'
import path from 'path'

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export type AllowedFileType = 'IMAGE' | 'PDF'

export interface ValidatedFileSuccess {
  valid: true
  sanitizedOriginalName: string
  storageKey: string
  fileType: AllowedFileType
  mimeType: string
  buffer: Buffer
}

export interface ValidatedFileFailure {
  valid: false
  error: string
}

export type ValidatedFileResult = ValidatedFileSuccess | ValidatedFileFailure

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])

/**
 * Sniffs the magic bytes (file signature) of a buffer to verify its real format
 */
export function detectMagicBytes(buffer: Buffer): { mimeType: string; fileType: AllowedFileType } | null {
  if (buffer.length < 12) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', fileType: 'IMAGE' }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', fileType: 'IMAGE' }
  }

  // WebP: 'RIFF' at byte 0, 'WEBP' at byte 8
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', fileType: 'IMAGE' }
  }

  // PDF: %PDF- (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mimeType: 'application/pdf', fileType: 'PDF' }
  }

  return null
}

/**
 * Strips path traversal sequences, control chars, and dangerous extensions from original filename
 */
export function sanitizeFileName(rawName: string): string {
  const ext = path.extname(rawName)
  const nameWithoutExt = path.basename(rawName, ext)
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase()
  return (sanitizedName || 'file') + sanitizedExt
}

/**
 * Authoritatively validates uploaded file:
 * 1. Checks file size (max 5MB)
 * 2. Whitelists file extension
 * 3. Inspects real content bytes (magic byte signature verification)
 * 4. Rejects SVG, executables, scripts, or disguised files
 */
export async function validateUploadedFile(file: {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}): Promise<ValidatedFileResult> {
  if (!file || file.size === 0) {
    return { valid: false, error: 'Empty file payload.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 5MB limit.' }
  }

  const sanitizedOriginalName = sanitizeFileName(file.name)
  const ext = path.extname(sanitizedOriginalName).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type "${ext}" is not permitted. Only JPG, PNG, WEBP, and PDF documents are allowed.`,
    }
  }

  const arrayBuf = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)

  const detected = detectMagicBytes(buffer)
  if (!detected) {
    return {
      valid: false,
      error: 'File signature verification failed: the file content does not match allowed image or PDF formats.',
    }
  }

  // Verify extension matches detected format
  if (detected.fileType === 'IMAGE') {
    if (ext === '.pdf') {
      return { valid: false, error: 'File extension does not match content.' }
    }
  } else if (detected.fileType === 'PDF') {
    if (ext !== '.pdf') {
      return { valid: false, error: 'File extension does not match PDF content.' }
    }
  }

  // Generate safe storage key
  const randomId = crypto.randomUUID()
  const storageKey = `${randomId}${ext}`

  return {
    valid: true,
    sanitizedOriginalName,
    storageKey,
    fileType: detected.fileType,
    mimeType: detected.mimeType,
    buffer,
  }
}
