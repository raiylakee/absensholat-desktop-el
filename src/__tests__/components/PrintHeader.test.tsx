import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PrintHeader } from "@/components/print-header"

describe("PrintHeader", () => {
  it("renders school name", () => {
    render(<PrintHeader title="Laporan Absensi" />)
    expect(screen.getByText("SMKN 2 Bandung")).toBeInTheDocument()
  })

  it("renders the report title", () => {
    render(<PrintHeader title="Daftar Siswa" />)
    expect(screen.getByText("Daftar Siswa")).toBeInTheDocument()
  })

  it("renders subtitle when provided", () => {
    render(<PrintHeader title="Laporan" subtitle="Semester Ganjil 2024/2025" />)
    expect(screen.getByText("Semester Ganjil 2024/2025")).toBeInTheDocument()
  })

  it("does not render subtitle when not provided", () => {
    render(<PrintHeader title="Laporan" />)
    expect(screen.queryByText("Semester Ganjil 2024/2025")).not.toBeInTheDocument()
  })

  it("renders 'Semua' when no filters provided", () => {
    render(<PrintHeader title="Laporan" />)
    expect(screen.getByText("Semua")).toBeInTheDocument()
  })

  it("renders 'Semua' when filters is an empty object", () => {
    render(<PrintHeader title="Laporan" filters={{}} />)
    expect(screen.getByText("Semua")).toBeInTheDocument()
  })

  it("renders filter key-value pairs when filters provided", () => {
    render(<PrintHeader title="Laporan" filters={{ "Konsentrasi Keahlian": "RPL", Kelas: "X RPL 1" }} />)
    // Use getAllByText since "RPL" appears in both "RPL" and "X RPL 1"
    const rplMatches = screen.getAllByText(/RPL/)
    expect(rplMatches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/X RPL 1/)).toBeInTheDocument()
  })

  it("renders student name and NIS when provided", () => {
    render(<PrintHeader title="Riwayat" studentName="Ahmad Budi" nis="12345" />)
    expect(screen.getByText("Ahmad Budi")).toBeInTheDocument()
    expect(screen.getByText("12345")).toBeInTheDocument()
  })

  it("does not render student section when studentName and nis are not provided", () => {
    render(<PrintHeader title="Laporan" />)
    expect(screen.queryByText("Nama:")).not.toBeInTheDocument()
    expect(screen.queryByText("NIS:")).not.toBeInTheDocument()
  })

  it("renders print date in DD MMMM YYYY format using Indonesian locale", () => {
    const date = new Date(2025, 0, 15) // 15 January 2025
    render(<PrintHeader title="Laporan" printDate={date} />)
    expect(screen.getByText("15 Januari 2025")).toBeInTheDocument()
  })

  it("renders print date for a different month in Indonesian", () => {
    const date = new Date(2025, 5, 3) // 3 June 2025
    render(<PrintHeader title="Laporan" printDate={date} />)
    expect(screen.getByText("03 Juni 2025")).toBeInTheDocument()
  })

  it("has hidden class and print:block class for print-only visibility", () => {
    const { container } = render(<PrintHeader title="Laporan" />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain("hidden")
    expect(root.className).toContain("print:block")
  })
})
