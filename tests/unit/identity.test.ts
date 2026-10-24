import { describe, it, expect } from 'vitest'
import { resolveLoginIdentifier } from '@/lib/identity'

describe('Canonical Login Identity Resolution (lib/identity.ts)', () => {
  it('resolves all Indian phone representations to canonical E.164 (+91XXXXXXXXXX)', () => {
    const testCases = [
      '9876543210',
      '+919876543210',
      '98765 43210',
      '09876543210',
      '+91 98765-43210',
      '(0) 98765 43210',
      ' 9876543210 ',
    ]

    for (const input of testCases) {
      const resolved = resolveLoginIdentifier(input)
      expect(resolved.type).toBe('PHONE')
      expect(resolved.value).toBe('+919876543210')
    }
  })

  it('resolves Student IDs to canonical uppercase TTA-XXXXX', () => {
    const testCases = [
      { input: 'TTA-0892', expected: 'TTA-0892' },
      { input: 'tta-0892', expected: 'TTA-0892' },
      { input: 'TTA-01001', expected: 'TTA-01001' },
      { input: ' tta-10025 ', expected: 'TTA-10025' },
    ]

    for (const { input, expected } of testCases) {
      const resolved = resolveLoginIdentifier(input)
      expect(resolved.type).toBe('STUDENT_ID')
      expect(resolved.value).toBe(expected)
    }
  })

  it('resolves admin handles and UUIDs to ADMIN_HANDLE', () => {
    expect(resolveLoginIdentifier('admin')).toEqual({
      type: 'ADMIN_HANDLE',
      value: 'admin',
      original: 'admin',
    })

    expect(resolveLoginIdentifier('admin_head')).toEqual({
      type: 'ADMIN_HANDLE',
      value: 'admin_head',
      original: 'admin_head',
    })

    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(resolveLoginIdentifier(uuid)).toEqual({
      type: 'ADMIN_HANDLE',
      value: uuid,
      original: uuid,
    })
  })

  it('handles empty and invalid identifiers gracefully', () => {
    expect(resolveLoginIdentifier('').type).toBe('UNKNOWN')
    expect(resolveLoginIdentifier('   ').type).toBe('UNKNOWN')
    expect(resolveLoginIdentifier('!@#$%^').type).toBe('UNKNOWN')
  })
})
