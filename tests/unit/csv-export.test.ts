import { describe, it, expect } from 'vitest'
import { generateCsvContent, exportToCsv } from '@/lib/csv-export'

describe('CSV Export Utility', () => {
  it('should generate RFC 4180 compliant CSV content with header and rows', () => {
    const headers = ['Name', 'Phone', 'Batch']
    const rows = [
      ['Sharath Kamal', '9876543210', 'ADVANCED'],
      ['Sathiyan G.', '9123456789', 'INTERMEDIATE'],
    ]

    const csv = generateCsvContent(headers, rows)
    expect(csv).toBe(
      '"Name","Phone","Batch"\r\n"Sharath Kamal","9876543210","ADVANCED"\r\n"Sathiyan G.","9123456789","INTERMEDIATE"'
    )
  })

  it('should escape internal quotes, commas, and newlines properly', () => {
    const headers = ['Player', 'Equipment']
    const rows = [
      ['Raman, S.', 'Blade with "Tenergy" rubber'],
      ['Player 2', 'Line 1\nLine 2'],
    ]

    const csv = generateCsvContent(headers, rows)
    expect(csv).toContain('"Raman, S."')
    expect(csv).toContain('"Blade with ""Tenergy"" rubber"')
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it('should format null and undefined cells safely as empty quoted strings', () => {
    const headers = ['ID', 'Notes']
    const rows = [
      ['TTA-01', null],
      ['TTA-02', undefined],
    ]

    const csv = generateCsvContent(headers, rows)
    expect(csv).toBe('"ID","Notes"\r\n"TTA-01",""\r\n"TTA-02",""')
  })

  it('should safely do nothing when exportToCsv is called in SSR / Node environment', () => {
    expect(() => exportToCsv('test_ssr', ['Col1'], [['Val1']])).not.toThrow()
  })
})
