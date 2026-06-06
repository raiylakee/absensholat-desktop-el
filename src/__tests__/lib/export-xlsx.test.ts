import { describe, it, expect } from 'vitest'
import { arrayToXlsxBase64 } from '@/lib/export-xlsx'
import * as XLSX from 'xlsx'

describe('arrayToXlsxBase64', () => {
  it('produces valid base64 that decodes to a readable xlsx workbook', () => {
    const headers = ['Nama', 'Email', 'NIP']
    const rows = [
      ['Ahmad', 'ahmad@smk.id', '198501'],
      ['Siti', 'siti@smk.id', '199002'],
    ]

    const b64 = arrayToXlsxBase64(headers, rows)

    expect(b64).toBeTruthy()
    expect(typeof b64).toBe('string')

    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const wb = XLSX.read(bytes, { type: 'array' })
    expect(wb.SheetNames.length).toBe(1)

    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    expect(data).toEqual([headers, ...rows])
  })

  it('handles empty rows', () => {
    const headers = ['Kolom A', 'Kolom B']
    const rows: string[][] = []

    const b64 = arrayToXlsxBase64(headers, rows)
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const wb = XLSX.read(bytes, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    expect(data).toEqual([headers])
  })

  it('handles values with special characters', () => {
    const headers = ['Nama', 'Catatan']
    const rows = [
      ['Budi', 'nilai "tinggi"'],
      ['Ani', 'karakter: & < >'],
    ]

    const b64 = arrayToXlsxBase64(headers, rows)
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const wb = XLSX.read(bytes, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    expect(data).toEqual([headers, ...rows])
  })

  it('handles single row', () => {
    const headers = ['X', 'Y', 'Z']
    const rows = [['1', '2', '3']]

    const b64 = arrayToXlsxBase64(headers, rows)
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const wb = XLSX.read(bytes, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    expect(data).toEqual([headers, ...rows])
  })
})
