import { useState, useCallback, useEffect, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Printer, Download, WifiOff, Users, Eye } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { usePrintAction } from "@/hooks/use-print-action"
import { useDownloadAction } from "@/hooks/use-download-action"
import { svgElementToPngBase64 } from "@/lib/svg-to-png"
import { PrintHeader } from "@/components/print-header"
import { HalanganDialog, type HalanganStudent } from "./HalanganDialog"
import { formatDateID } from "@/lib/date-utils"

function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const QR_REFRESH_INTERVAL = 30_000
const POLL_INTERVAL = 10_000

export function HalanganTab() {
  const [token, setToken] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  const [pendingItems, setPendingItems] = useState<HalanganStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<HalanganStudent | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { print } = usePrintAction()
  const { isDownloading, download } = useDownloadAction()
  const qrRef = useRef<SVGSVGElement>(null)
  const isMounted = useRef(true)
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generateQR = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const response = await window.electronAPI.generateHalanganQr() as any
      if (!isMounted.current) return
      const data = response?.data ?? response
      const qrToken = data?.token ?? null
      if (!qrToken) {
        setToken(null)
        return
      }
      setToken(qrToken)
      setGeneratedAt(new Date())
      setAccessDenied(false)
    } catch (err: any) {
      if (!isMounted.current) return
      const msg = err?.message ?? String(err)
      if (msg.includes("Hanya guru perempuan") || msg.includes("Forbidden")) {
        setAccessDenied(true)
      }
      setToken(null)
    } finally {
      if (isMounted.current && !silent) setIsLoading(false)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    try {
      const response: any = await window.electronAPI.getPendingHalangan()
      if (!isMounted.current) return
      const data = response?.data ?? []
      setPendingItems(Array.isArray(data) ? data : [])
    } catch {
      // silently ignore poll errors
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    generateQR()
    fetchPending()

    qrTimerRef.current = setInterval(() => generateQR(true), QR_REFRESH_INTERVAL)
    pollTimerRef.current = setInterval(fetchPending, POLL_INTERVAL)

    return () => {
      isMounted.current = false
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [generateQR, fetchPending])

  const handleApprove = useCallback(async (id: number, keterangan?: string) => {
    setIsProcessing(true)
    try {
      await window.electronAPI.approveHalangan({ id, body: { keterangan: keterangan || "" } })
      setSelectedStudent(null)
      fetchPending()
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message ?? "Gagal menyetujui"
      alert(msg)
    } finally {
      setIsProcessing(false)
    }
  }, [fetchPending])

  const handleReject = useCallback(async (id: number, keterangan: string) => {
    setIsProcessing(true)
    try {
      await window.electronAPI.rejectHalangan({ id, body: { keterangan } })
      setSelectedStudent(null)
      fetchPending()
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message ?? "Gagal menolak"
      alert(msg)
    } finally {
      setIsProcessing(false)
    }
  }, [fetchPending])

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex-1">
        <Card className="w-full border">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <WifiOff className="size-12 opacity-30" />
            <p className="text-sm font-medium">Akses Dibatasi</p>
            <p className="text-xs text-center max-w-sm">
              Hanya admin dan guru perempuan yang dapat membuat QR Halangan.
              Silakan hubungi admin untuk mengatur jenis kelamin pada profil guru.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex-1 space-y-6">
      <Card className="w-full border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QR Halangan</CardTitle>
              <CardDescription className="mt-1">
                QR untuk siswi yang sedang haid — auto-refresh setiap 30 detik
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!token || isDownloading}
                      onClick={() =>
                        download({
                          filenameOptions: { dataType: "qr-halangan", format: "png" },
                          dialogFilters: [{ name: "Gambar PNG", extensions: ["png"] }],
                          fetchData: async () => {
                            const svgElement = qrRef.current
                            if (!svgElement) throw new Error("Elemen SVG tidak ditemukan")
                            const base64 = await svgElementToPngBase64(svgElement)
                            return { data: base64, encoding: "base64" }
                          },
                        })
                      }
                    >
                      <Download className="size-4" />
                      Unduh
                    </Button>
                  </TooltipTrigger>
                  {!token && <TooltipContent><p>Menunggu QR tersedia</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" className="gap-2" onClick={print} disabled={!token}>
                <Printer className="size-4" /> Cetak
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">memuat qr halangan...</p>
            </div>
          )}

          {!isLoading && token && (
            <div className="flex flex-col items-center gap-4">
              <PrintHeader title="QR Halangan" subtitle="Scan QR ini untuk pengajuan halangan (haid)" />
              <div className="rounded-xl border bg-white p-4 ring-2 ring-pink-200">
                <QRCodeSVG value={token} size={200} ref={qrRef} />
              </div>
              {generatedAt && (
                <p className="text-xs text-muted-foreground">
                  Terakhir diperbarui: {formatTime(generatedAt)}
                </p>
              )}
            </div>
          )}

          {!isLoading && !token && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <WifiOff className="size-12 opacity-30" />
              <p className="text-sm">Tidak dapat membuat QR Halangan.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card className="w-full border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Pengajuan Menunggu Validasi
          </CardTitle>
          <CardDescription>
            {pendingItems.length === 0
              ? "belum ada pengajuan halangan yang menunggu"
              : `${pendingItems.length} siswi menunggu validasi halangan`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="size-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Daftar kosong — QR akan muncul saat ada pengajuan</p>
              <p className="text-xs mt-1">Data diperbarui setiap 10 detik</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-auto max-h-[calc(100vh-24rem)]">
                <table className="w-full text-sm">
                  <thead className="bg-card sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">NIS</th>
                      <th className="px-4 py-3 text-left font-medium">Nama</th>
                      <th className="px-4 py-3 text-left font-medium">Kelas</th>
                      <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                      <th className="px-4 py-3 text-left font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map((item) => (
                      <tr key={item.id_halangan} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{item.nis}</td>
                        <td className="px-4 py-3">{item.nama_siswa}</td>
                        <td className="px-4 py-3">{item.kelas || "-"}</td>
                        <td className="px-4 py-3">{formatDateID(item.tanggal)}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStudent(item)}
                          >
                            <Eye className="mr-2 size-4" />
                            Validasi
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <HalanganDialog
        student={selectedStudent}
        isProcessing={isProcessing}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}
