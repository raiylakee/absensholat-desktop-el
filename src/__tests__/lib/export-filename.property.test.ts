import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { generateExportFilename, ExportDataType, ExportFormat } from '@/lib/export-filename'

const allDataTypes: ExportDataType[] = [
  'laporan-absensi',
  'data-siswa',
  'qr-presensi',
  'riwayat-kehadiran',
  'riwayat-absensi-saya',
  'bukti-izin',
  'daftar-guru',
]

const allFormats: ExportFormat[] = ['xlsx', 'csv', 'pdf', 'png']

const dataTypeArb = fc.constantFrom(...allDataTypes)
const formatArb = fc.constantFrom(...allFormats)

// Use bounded dates to ensure valid Date objects (no NaN dates)
const validDateArb = fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })

const validFilenameOptionsArb = fc.record({
  dataType: dataTypeArb,
  format: formatArb,
  date: fc.option(validDateArb, { nil: undefined }),
  filter: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  studentName: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  nis: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
})

describe('Property-Based Tests: generateExportFilename', () => {
  /**
   * Property 1: Filename Character Safety
   * Validates: Requirements 14.1
   */
  it('Property 1: filename only contains safe characters and is ≤255 chars', () => {
    fc.assert(
      fc.property(validFilenameOptionsArb, (opts) => {
        const filename = generateExportFilename(opts)
        expect(filename).toMatch(/^[a-z0-9.\-]+$/)
        expect(filename.length).toBeLessThanOrEqual(255)
      }),
      { numRuns: 200 }
    )
  })

  /**
   * Property 2: Filename Always Contains Date
   * Validates: Requirements 14.2
   */
  it('Property 2: filename always contains YYYY-MM-DD date', () => {
    fc.assert(
      fc.property(validFilenameOptionsArb, (opts) => {
        const filename = generateExportFilename(opts)
        expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/)
      }),
      { numRuns: 200 }
    )
  })

  /**
   * Property 3: Filename Extension Matches Format
   * Validates: Requirements 14.4
   */
  it('Property 3: filename extension matches format', () => {
    fc.assert(
      fc.property(
        fc.record({
          dataType: dataTypeArb,
          format: formatArb,
          date: fc.option(validDateArb, { nil: undefined }),
        }),
        ({ dataType, format, date }) => {
          const filename = generateExportFilename({ dataType, format, date })
          expect(filename).toMatch(new RegExp(`\\.${format}$`))
        }
      ),
      { numRuns: 200 }
    )
  })

  /**
   * Property 4: Filename Uniqueness Across Inputs
   * Validates: Requirements 14.3
   */
  it('Property 4: different dataType, date, or filter produce different filenames', () => {
    // Test uniqueness across different dataTypes (same date, no filter)
    fc.assert(
      fc.property(
        fc.tuple(dataTypeArb, dataTypeArb).filter(([a, b]) => a !== b),
        validDateArb,
        formatArb,
        ([typeA, typeB], date, format) => {
          const filenameA = generateExportFilename({ dataType: typeA, format, date })
          const filenameB = generateExportFilename({ dataType: typeB, format, date })
          expect(filenameA).not.toBe(filenameB)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4b: different dates produce different filenames (same dataType and filter)', () => {
    fc.assert(
      fc.property(
        dataTypeArb,
        formatArb,
        // Two dates that differ by at least one day
        fc.tuple(
          validDateArb,
          validDateArb,
        ).filter(([a, b]) => {
          const aStr = `${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`
          const bStr = `${b.getFullYear()}-${b.getMonth()}-${b.getDate()}`
          return aStr !== bStr
        }),
        (dataType, format, [dateA, dateB]) => {
          const filenameA = generateExportFilename({ dataType, format, date: dateA })
          const filenameB = generateExportFilename({ dataType, format, date: dateB })
          expect(filenameA).not.toBe(filenameB)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4c: different non-empty filters produce different filenames (same dataType and date)', () => {
    // Only test dataTypes that use the filter field
    const filterDataTypes = fc.constantFrom('laporan-absensi', 'data-siswa') as fc.Arbitrary<ExportDataType>
    fc.assert(
      fc.property(
        filterDataTypes,
        formatArb,
        validDateArb,
        // Two distinct non-empty filters that sanitize to different values
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
        ).filter(([a, b]) => a.toLowerCase() !== b.toLowerCase()),
        (dataType, format, date, [filterA, filterB]) => {
          const filenameA = generateExportFilename({ dataType, format, date, filter: filterA })
          const filenameB = generateExportFilename({ dataType, format, date, filter: filterB })
          expect(filenameA).not.toBe(filenameB)
        }
      ),
      { numRuns: 100 }
    )
  })
})
