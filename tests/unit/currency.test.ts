import { describe, it, expect } from 'vitest'
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  formatRupees,
} from '@/lib/currency'

describe('Currency and Integer Paise Calculations', () => {
  describe('rupeesToPaise', () => {
    it('should accurately convert integer rupees to paise', () => {
      expect(rupeesToPaise(0)).toBe(0)
      expect(rupeesToPaise(1)).toBe(100)
      expect(rupeesToPaise(1500)).toBe(150000)
      expect(rupeesToPaise(4000)).toBe(400000)
    })

    it('should avoid IEEE 754 precision rounding issues on float decimals', () => {
      // 19.99 * 100 in native JS float is 1998.9999999999998
      expect(rupeesToPaise(19.99)).toBe(1999)
      expect(rupeesToPaise(0.1 + 0.2)).toBe(30)
      expect(rupeesToPaise(1500.5)).toBe(150050)
      expect(rupeesToPaise(250.75)).toBe(25075)
    })

    it('should handle numeric string inputs', () => {
      expect(rupeesToPaise('1500')).toBe(150000)
      expect(rupeesToPaise(' 2500.50 ')).toBe(250050)
    })

    it('should reject negative amounts', () => {
      expect(() => rupeesToPaise(-10)).toThrow(RangeError)
    })

    it('should reject invalid non-numeric inputs', () => {
      expect(() => rupeesToPaise('abc')).toThrow(TypeError)
      expect(() => rupeesToPaise(NaN)).toThrow(TypeError)
    })
  })

  describe('paiseToRupees', () => {
    it('should convert paise to rupees accurately', () => {
      expect(paiseToRupees(0)).toBe(0)
      expect(paiseToRupees(100)).toBe(1)
      expect(paiseToRupees(150000)).toBe(1500)
      expect(paiseToRupees(1999)).toBe(19.99)
      expect(paiseToRupees(25075)).toBe(250.75)
    })
  })

  describe('formatINR', () => {
    it('should format whole rupee amounts without trailing paise decimals by default', () => {
      const formatted = formatINR(150000)
      // Standard Intl output contains ₹ and 1,500
      expect(formatted).toContain('1,500')
      expect(formatted).not.toContain('.00')
    })

    it('should format amounts with fractional paise correctly', () => {
      const formatted = formatINR(150050)
      expect(formatted).toContain('1,500.50')
    })

    it('should handle null, undefined, or zero cleanly', () => {
      expect(formatINR(0)).toContain('0')
      expect(formatINR(null)).toBe('₹0')
      expect(formatINR(undefined)).toBe('₹0')
    })
  })

  describe('formatRupees', () => {
    it('should format plain rupee numbers properly', () => {
      expect(formatRupees(2500)).toContain('2,500')
      expect(formatRupees(0)).toContain('0')
    })
  })
})
