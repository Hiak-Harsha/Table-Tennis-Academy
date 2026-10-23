import { describe, it, expect } from 'vitest'
import {
  detectMagicBytes,
  sanitizeFileName,
  validateUploadedFile,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/file-security'

describe('File Upload Security & Signature Verification', () => {
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ])
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ])
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer<<>>')

  describe('detectMagicBytes', () => {
    it('should accurately detect PNG signature', () => {
      const result = detectMagicBytes(validPngBuffer)
      expect(result).not.toBeNull()
      expect(result?.mimeType).toBe('image/png')
      expect(result?.fileType).toBe('IMAGE')
    })

    it('should accurately detect JPEG signature', () => {
      const result = detectMagicBytes(validJpegBuffer)
      expect(result).not.toBeNull()
      expect(result?.mimeType).toBe('image/jpeg')
      expect(result?.fileType).toBe('IMAGE')
    })

    it('should accurately detect PDF signature', () => {
      const result = detectMagicBytes(validPdfBuffer)
      expect(result).not.toBeNull()
      expect(result?.mimeType).toBe('application/pdf')
      expect(result?.fileType).toBe('PDF')
    })

    it('should reject plain text or non-matching byte signatures', () => {
      const textBuffer = Buffer.from('This is a plain text file.')
      expect(detectMagicBytes(textBuffer)).toBeNull()
    })
  })

  describe('sanitizeFileName', () => {
    it('should strip path traversal attempts', () => {
      expect(sanitizeFileName('../../etc/passwd.png')).toBe('passwd.png')
      expect(sanitizeFileName('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe')
    })

    it('should replace dangerous and non-alphanumeric characters with underscores', () => {
      expect(sanitizeFileName('my image (1) #@!.png')).toBe('my_image_1.png')
    })
  })

  describe('validateUploadedFile', () => {
    it('should accept valid PNG uploads', async () => {
      const file = {
        name: 'avatar.png',
        size: validPngBuffer.length,
        arrayBuffer: async () =>
          validPngBuffer.buffer.slice(
            validPngBuffer.byteOffset,
            validPngBuffer.byteOffset + validPngBuffer.byteLength
          ),
      }

      const res = await validateUploadedFile(file)
      expect(res.valid).toBe(true)
      if (res.valid) {
        expect(res.fileType).toBe('IMAGE')
        expect(res.mimeType).toBe('image/png')
        expect(res.storageKey).toMatch(/\.png$/)
      }
    })

    it('should accept valid PDF uploads', async () => {
      const file = {
        name: 'tournament_rules.pdf',
        size: validPdfBuffer.length,
        arrayBuffer: async () =>
          validPdfBuffer.buffer.slice(
            validPdfBuffer.byteOffset,
            validPdfBuffer.byteOffset + validPdfBuffer.byteLength
          ),
      }

      const res = await validateUploadedFile(file)
      expect(res.valid).toBe(true)
      if (res.valid) {
        expect(res.fileType).toBe('PDF')
        expect(res.mimeType).toBe('application/pdf')
        expect(res.storageKey).toMatch(/\.pdf$/)
      }
    })

    it('should reject disguised files (e.g. plain text with .png extension)', async () => {
      const fakeBuffer = Buffer.from('This is malicious text disguised as image')
      const file = {
        name: 'exploit.png',
        size: fakeBuffer.length,
        arrayBuffer: async () => fakeBuffer.buffer,
      }

      const res = await validateUploadedFile(file)
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toMatch(/signature verification failed/i)
      }
    })

    it('should reject SVG files due to script injection risks', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
      const file = {
        name: 'vector.svg',
        size: svgBuffer.length,
        arrayBuffer: async () => svgBuffer.buffer,
      }

      const res = await validateUploadedFile(file)
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toMatch(/not permitted/i)
      }
    })

    it('should reject files exceeding 5MB size limit', async () => {
      const file = {
        name: 'large_video.png',
        size: MAX_FILE_SIZE_BYTES + 1024,
        arrayBuffer: async () => validPngBuffer.buffer,
      }

      const res = await validateUploadedFile(file)
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toMatch(/exceeds 5MB/i)
      }
    })
  })
})
