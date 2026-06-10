export type ExportDataType =
  | 'laporan-absensi'
  | 'data-siswa'
  | 'qr-presensi'
  | 'riwayat-kehadiran'
  | 'riwayat-absensi-saya'
  | 'bukti-izin'
  | 'daftar-guru'
  | 'qr-halangan'

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'png'

export interface ExportFilenameOptions {
  dataType: ExportDataType
  format: ExportFormat
  date?: Date          // defaults to new Date()
  filter?: string      // e.g. jurusan name, "semua" if no filter
  studentName?: string // for riwayat-kehadiran
  nis?: string         // for riwayat-kehadiran
}

/**
 * Sanitizes a string segment for use in a filename:
 * - Converts to lowercase
 * - Replaces spaces and non-alphanumeric characters (except `-` and `.`) with `-`
 * - Collapses consecutive hyphens into one
 * - Trims leading/trailing hyphens
 */
function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\-\.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Formats a Date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a Date as HHmm (hours and minutes, zero-padded).
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}${minutes}`
}

/**
 * Generates a consistent, filesystem-safe export filename.
 * Pure function — no side effects.
 *
 * Rules:
 * - All characters are lowercase
 * - Spaces and non-alphanumeric characters (except `-` and `.`) are replaced with `-`
 * - Date is always in YYYY-MM-DD format
 * - Empty/undefined filter defaults to "semua"
 * - Maximum length of 255 characters (truncated before extension if needed)
 *
 * Examples:
 * - laporan-absensi-semua-2025-01-15.xlsx
 * - data-siswa-rpl-2025-01-15.csv
 * - qr-presensi-2025-01-15-0930.png
 * - riwayat-ahmad-budi-12345-2025-01-15.csv
 * - daftar-guru-2025-01-15.csv
 */
export function generateExportFilename(options: ExportFilenameOptions): string {
  const { dataType, format, date, filter, studentName, nis } = options
  // Guard against invalid Date objects (e.g. new Date(NaN))
  const effectiveDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date()
  const dateStr = formatDate(effectiveDate)
  const extension = `.${format}`

  let baseName: string

  switch (dataType) {
    case 'qr-presensi': {
      const timeStr = formatTime(effectiveDate)
      baseName = `qr-presensi-${dateStr}-${timeStr}`
      break
    }

    case 'riwayat-kehadiran': {
      const namePart = studentName ? sanitizeSegment(studentName) : ''
      const nisPart = nis ? sanitizeSegment(nis) : ''
      const parts = ['riwayat', namePart, nisPart, dateStr].filter(Boolean)
      baseName = parts.join('-')
      break
    }

    case 'laporan-absensi': {
      const filterPart = filter && filter.trim() ? sanitizeSegment(filter) : 'semua'
      baseName = `laporan-absensi-${filterPart}-${dateStr}`
      break
    }

    case 'data-siswa': {
      const filterPart = filter && filter.trim() ? sanitizeSegment(filter) : 'semua'
      baseName = `data-siswa-${filterPart}-${dateStr}`
      break
    }

    case 'riwayat-absensi-saya': {
      baseName = `riwayat-absensi-saya-${dateStr}`
      break
    }

    case 'bukti-izin': {
      baseName = `bukti-izin-${dateStr}`
      break
    }

    case 'daftar-guru': {
      baseName = `daftar-guru-${dateStr}`
      break
    }

    default: {
      // Fallback: sanitize dataType + date
      baseName = `${sanitizeSegment(dataType)}-${dateStr}`
      break
    }
  }

  // Enforce maximum length of 255 characters (truncate base before extension)
  const maxBaseLength = 255 - extension.length
  if (baseName.length > maxBaseLength) {
    baseName = baseName.slice(0, maxBaseLength)
    // Remove trailing hyphens after truncation
    baseName = baseName.replace(/-+$/, '')
  }

  return `${baseName}${extension}`
}

/**
 * Serializes a 2D array of strings to CSV format with proper quoting.
 * Values containing double quotes are escaped by doubling them.
 */
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
}
