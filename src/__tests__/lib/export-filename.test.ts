import { describe, it, expect } from 'vitest'
import { generateExportFilename, arrayToCsv } from '@/lib/export-filename'

const fixedDate = new Date('2025-01-15T09:30:00')

describe('generateExportFilename', () => {
  describe('laporan-absensi', () => {
    it('uses "semua" when no filter provided', () => {
      expect(generateExportFilename({ dataType: 'laporan-absensi', format: 'xlsx', date: fixedDate }))
        .toBe('laporan-absensi-semua-2025-01-15.xlsx')
    })

    it('uses "semua" when filter is empty string', () => {
      expect(generateExportFilename({ dataType: 'laporan-absensi', format: 'xlsx', date: fixedDate, filter: '' }))
        .toBe('laporan-absensi-semua-2025-01-15.xlsx')
    })

    it('uses "semua" when filter is whitespace only', () => {
      expect(generateExportFilename({ dataType: 'laporan-absensi', format: 'xlsx', date: fixedDate, filter: '   ' }))
        .toBe('laporan-absensi-semua-2025-01-15.xlsx')
    })

    it('includes filter in filename', () => {
      expect(generateExportFilename({ dataType: 'laporan-absensi', format: 'csv', date: fixedDate, filter: 'RPL' }))
        .toBe('laporan-absensi-rpl-2025-01-15.csv')
    })

    it('sanitizes filter with spaces', () => {
      expect(generateExportFilename({ dataType: 'laporan-absensi', format: 'pdf', date: fixedDate, filter: 'X RPL 1' }))
        .toBe('laporan-absensi-x-rpl-1-2025-01-15.pdf')
    })
  })

  describe('data-siswa', () => {
    it('uses "semua" when no filter', () => {
      expect(generateExportFilename({ dataType: 'data-siswa', format: 'csv', date: fixedDate }))
        .toBe('data-siswa-semua-2025-01-15.csv')
    })

    it('includes jurusan filter', () => {
      expect(generateExportFilename({ dataType: 'data-siswa', format: 'csv', date: fixedDate, filter: 'RPL' }))
        .toBe('data-siswa-rpl-2025-01-15.csv')
    })
  })

  describe('qr-presensi', () => {
    it('includes date and time (HHmm)', () => {
      expect(generateExportFilename({ dataType: 'qr-presensi', format: 'png', date: fixedDate }))
        .toBe('qr-presensi-2025-01-15-0930.png')
    })

    it('zero-pads hours and minutes', () => {
      const d = new Date('2025-01-15T08:05:00')
      expect(generateExportFilename({ dataType: 'qr-presensi', format: 'png', date: d }))
        .toBe('qr-presensi-2025-01-15-0805.png')
    })
  })

  describe('riwayat-kehadiran', () => {
    it('includes student name and NIS', () => {
      expect(generateExportFilename({
        dataType: 'riwayat-kehadiran',
        format: 'csv',
        date: fixedDate,
        studentName: 'Ahmad Budi',
        nis: '12345',
      })).toBe('riwayat-ahmad-budi-12345-2025-01-15.csv')
    })

    it('sanitizes student name with special characters', () => {
      expect(generateExportFilename({
        dataType: 'riwayat-kehadiran',
        format: 'csv',
        date: fixedDate,
        studentName: 'Siti Nur\'aini',
        nis: '67890',
      })).toBe('riwayat-siti-nur-aini-67890-2025-01-15.csv')
    })

    it('works without studentName and nis', () => {
      const result = generateExportFilename({ dataType: 'riwayat-kehadiran', format: 'csv', date: fixedDate })
      expect(result).toBe('riwayat-2025-01-15.csv')
    })
  })

  describe('riwayat-absensi-saya', () => {
    it('generates correct filename', () => {
      expect(generateExportFilename({ dataType: 'riwayat-absensi-saya', format: 'csv', date: fixedDate }))
        .toBe('riwayat-absensi-saya-2025-01-15.csv')
    })
  })

  describe('bukti-izin', () => {
    it('generates correct filename', () => {
      expect(generateExportFilename({ dataType: 'bukti-izin', format: 'pdf', date: fixedDate }))
        .toBe('bukti-izin-2025-01-15.pdf')
    })
  })

  describe('daftar-guru', () => {
    it('generates correct filename', () => {
      expect(generateExportFilename({ dataType: 'daftar-guru', format: 'csv', date: fixedDate }))
        .toBe('daftar-guru-2025-01-15.csv')
    })
  })

  describe('date formatting', () => {
    it('formats date as YYYY-MM-DD', () => {
      const d = new Date('2024-03-05T00:00:00')
      const result = generateExportFilename({ dataType: 'daftar-guru', format: 'csv', date: d })
      expect(result).toContain('2024-03-05')
    })

    it('zero-pads month and day', () => {
      const d = new Date('2025-01-05T00:00:00')
      const result = generateExportFilename({ dataType: 'daftar-guru', format: 'csv', date: d })
      expect(result).toContain('2025-01-05')
    })

    it('defaults to current date when date not provided', () => {
      const before = new Date()
      const result = generateExportFilename({ dataType: 'daftar-guru', format: 'csv' })
      // The filename should contain today's date
      const todayStr = `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, '0')}-${String(before.getDate()).padStart(2, '0')}`
      expect(result).toContain(todayStr)
    })
  })

  describe('character safety', () => {
    it('produces only lowercase alphanumeric, hyphens, and dots', () => {
      const result = generateExportFilename({
        dataType: 'data-siswa',
        format: 'csv',
        date: fixedDate,
        filter: 'Teknik Komputer & Jaringan',
      })
      expect(result).toMatch(/^[a-z0-9.\-]+$/)
    })

    it('collapses consecutive hyphens', () => {
      const result = generateExportFilename({
        dataType: 'laporan-absensi',
        format: 'xlsx',
        date: fixedDate,
        filter: 'A  B',
      })
      expect(result).not.toContain('--')
    })
  })

  describe('maximum length', () => {
    it('truncates filename to 255 characters maximum', () => {
      const longName = 'A'.repeat(300)
      const result = generateExportFilename({
        dataType: 'riwayat-kehadiran',
        format: 'csv',
        date: fixedDate,
        studentName: longName,
        nis: '12345',
      })
      expect(result.length).toBeLessThanOrEqual(255)
    })

    it('preserves extension after truncation', () => {
      const longName = 'A'.repeat(300)
      const result = generateExportFilename({
        dataType: 'riwayat-kehadiran',
        format: 'xlsx',
        date: fixedDate,
        studentName: longName,
      })
      expect(result).toMatch(/\.xlsx$/)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe('format extensions', () => {
    it.each([
      ['xlsx', '.xlsx'],
      ['csv', '.csv'],
      ['pdf', '.pdf'],
      ['png', '.png'],
    ] as const)('format %s produces extension %s', (format, ext) => {
      const result = generateExportFilename({ dataType: 'daftar-guru', format, date: fixedDate })
      expect(result).toMatch(new RegExp(`\\${ext}$`))
    })
  })
})

describe('arrayToCsv', () => {
  it('produces correct CSV with headers and rows', () => {
    const result = arrayToCsv(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']])
    expect(result).toBe('"Name","Age"\n"Alice","30"\n"Bob","25"')
  })

  it('escapes double quotes in values', () => {
    const result = arrayToCsv(['Quote'], [['"hello"']])
    expect(result).toBe('"Quote"\n"""hello"""')
  })

  it('handles empty rows', () => {
    const result = arrayToCsv(['Col'], [])
    expect(result).toBe('"Col"')
  })

  it('handles empty string values', () => {
    const result = arrayToCsv(['A', 'B'], [['', 'value']])
    expect(result).toBe('"A","B"\n"","value"')
  })
})
