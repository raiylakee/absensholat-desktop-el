import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { formatDateID } from "@/lib/date-utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Download, Printer } from "lucide-react"
import { useDownloadAction } from "@/hooks/use-download-action"
import { usePrintAction } from "@/hooks/use-print-action"
import { arrayToXlsxBase64 } from "@/lib/export-xlsx"
import { PrintHeader } from "@/components/print-header"

interface AbsensiStaffItem {
  id_absen: number
  nis: string
  nama_siswa: string
  kelas: string
  jurusan: string
  tanggal: string
  hari: string
  jenis_sholat: string
  status: string
}

interface AttendanceHistoryResponse {
  data: {
    absensi: AbsensiStaffItem[]
    pagination: {
      page: number
      limit: number
      total_items: number
      total_pages: number
    }
  }
}

interface AttendanceHistoryPanelProps {
  nis: string
  studentName: string
  open: boolean
  onClose: () => void
}

export function AttendanceHistoryPanel({
  nis,
  studentName,
  open,
  onClose,
}: AttendanceHistoryPanelProps) {
  const [records, setRecords] = useState<AbsensiStaffItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDownloading, download } = useDownloadAction()
  const { print } = usePrintAction()

  const handleDownload = useCallback(() => {
    download({
      filenameOptions: {
        dataType: 'riwayat-kehadiran',
        format: 'xlsx',
        studentName,
        nis,
      },
      fetchData: async () => {
        const headers = ['Tanggal', 'Hari', 'Jenis Sholat', 'Status']
        const rows = records.map((r) => [r.tanggal, r.hari, r.jenis_sholat, r.status])
        const data = arrayToXlsxBase64(headers, rows)
        return { data, encoding: 'base64' as const }
      },
      dialogFilters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    })
  }, [download, records, studentName, nis])

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setRecords([])

    try {
      const response = await Promise.race([
        window.electronAPI.getStudentAttendanceHistory({ nis }) as Promise<AttendanceHistoryResponse>,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ])

      setRecords(response.data?.absensi || [])
    } catch (err: any) {
      if (err?.message === "timeout") {
        setError("Waktu permintaan habis. Silakan coba lagi.")
      } else {
        setError(typeof err === "string" ? err : "Gagal memuat riwayat kehadiran.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [nis])

  useEffect(() => {
    if (open) {
      fetchHistory()
    } else {
      // Reset state when panel closes
      setRecords([])
      setError(null)
      setIsLoading(false)
    }
  }, [open, fetchHistory])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "hadir":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Hadir</Badge>
      case "izin":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Izin</Badge>
      case "sakit":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Sakit</Badge>
      case "alpha":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Alpa</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Riwayat Kehadiran</SheetTitle>
              <SheetDescription>
                {studentName} — NIS: {nis}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isLoading || isDownloading}
                      aria-label="Unduh Riwayat"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Unduh Riwayat
                    </Button>
                  </TooltipTrigger>
                  {isLoading && (
                    <TooltipContent>
                      <p>Data sedang dimuat, harap tunggu</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={print}
                      disabled={isLoading}
                      aria-label="Cetak Riwayat"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isLoading
                      ? "Data sedang dimuat, harap tunggu"
                      : "Cetak Riwayat"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 pb-4">
          <PrintHeader
            title="Riwayat Kehadiran"
            studentName={studentName}
            nis={nis}
          />
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" />
              <p className="mt-3 text-sm text-muted-foreground">memuat riwayat kehadiran...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchHistory}>
                Coba Lagi
              </Button>
            </div>
          )}

          {!isLoading && !error && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada riwayat kehadiran untuk siswa ini.
              </p>
            </div>
          )}

          {!isLoading && !error && records.length > 0 && (
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="overflow-auto max-h-[calc(100vh-18rem)]">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium">Tanggal</th>
                      <th className="px-3 py-2.5 text-left font-medium">Hari</th>
                      <th className="px-3 py-2.5 text-left font-medium">Sholat</th>
                      <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr
                        key={`${record.tanggal}-${record.jenis_sholat}-${index}`}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2.5">{formatDateID(record.tanggal)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{record.hari}</td>
                        <td className="px-3 py-2.5">{record.jenis_sholat}</td>
                        <td className="px-3 py-2.5">{getStatusBadge(record.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
