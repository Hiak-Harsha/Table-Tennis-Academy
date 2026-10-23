/**
 * CSV Export Utility
 * Generates RFC 4180 compliant CSV files and triggers client-side browser downloads.
 */

function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '""'
  const str = String(cell)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export function generateCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerRow = headers.map(escapeCsvCell).join(',')
  const bodyRows = rows.map((row) => row.map(escapeCsvCell).join(','))
  return [headerRow, ...bodyRows].join('\r\n')
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  if (typeof window === 'undefined') return

  const csvContent = generateCsvContent(headers, rows)

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
