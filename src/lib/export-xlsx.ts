import * as XLSX from "xlsx-js-style"

/**
 * Converts headers and rows into a base64-encoded xlsx binary string.
 * Use with `useDownloadAction` where encoding is 'base64'.
 */
export function arrayToXlsxBase64(
  headers: string[],
  rows: string[][]
): string {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  for (let c = 0; c < headers.length; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" })
  let binary = ""
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i])
  }
  return btoa(binary)
}
