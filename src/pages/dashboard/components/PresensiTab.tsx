import { useState, useCallback, useEffect, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Keyboard, Download, WifiOff } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDownloadAction } from "@/hooks/use-download-action"
import { svgElementToPngBase64 } from "@/lib/svg-to-png"

function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const QR_REFRESH_INTERVAL = 30_000
const CODE_REFRESH_INTERVAL = 20_000

export function PresensiTab() {
  const [token, setToken] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prayerName, setPrayerName] = useState<string | null>(null)
  const [noSchedule, setNoSchedule] = useState(false)

  const { isDownloading, download } = useDownloadAction()
  const qrRef = useRef<SVGSVGElement>(null)

  const [attendanceCode, setAttendanceCode] = useState<string | null>(null)
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0)
  const [codePrayer, setCodePrayer] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)

  const isMounted = useRef(true)
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const codeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generateQR = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const response = await window.electronAPI.generateQrToken() as any
      if (!isMounted.current) return
      const data = response?.data ?? response
      const qrToken = data?.token ?? (typeof response === "string" ? response : null)
      if (!qrToken) {
        setNoSchedule(true)
        setToken(null)
        return
      }
      setToken(qrToken as string)
      setGeneratedAt(new Date())
      setPrayerName(data?.jenis_sholat ?? null)
      setNoSchedule(false)
    } catch {
      if (!isMounted.current) return
      setNoSchedule(true)
      setToken(null)
    } finally {
      if (isMounted.current && !silent) setIsLoading(false)
    }
  }, [])

  const fetchAttendanceCode = useCallback(async () => {
    try {
      const response: any = await window.electronAPI.generateAttendanceCode()
      if (!isMounted.current) return
      const data = response?.data ?? response
      setAttendanceCode(data?.code ?? null)
      setCodeExpiresIn(data?.expires_in ?? 0)
      setCodePrayer(data?.jenis_sholat ?? null)
      setCodeError(null)
    } catch {
      if (!isMounted.current) return
      setAttendanceCode(null)
      setCodeError("Tidak ada jadwal salat aktif")
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    generateQR()
    fetchAttendanceCode()

    qrTimerRef.current = setInterval(() => generateQR(true), QR_REFRESH_INTERVAL)
    codeTimerRef.current = setInterval(fetchAttendanceCode, CODE_REFRESH_INTERVAL)

    return () => {
      isMounted.current = false
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
      if (codeTimerRef.current) clearInterval(codeTimerRef.current)
    }
  }, [generateQR, fetchAttendanceCode])

  useEffect(() => {
    if (codeExpiresIn <= 0) return
    const interval = setInterval(() => {
      setCodeExpiresIn((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [attendanceCode])

  return (
    <div className="min-h-[60vh] flex-1">
      <Card className="w-full border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kode QR Presensi</CardTitle>
              {prayerName && (
                <CardDescription className="mt-1">sholat {prayerName} — otomatis diperbarui setiap 30 detik</CardDescription>
              )}
              {!prayerName && !isLoading && !noSchedule && (
                <CardDescription className="mt-1">otomatis diperbarui setiap 30 detik</CardDescription>
              )}
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
                          filenameOptions: { dataType: "qr-presensi", format: "png" },
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
                  {!token && <TooltipContent><p>Menunggu jadwal salat aktif</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">memuat qr code...</p>
            </div>
          )}
          {!isLoading && token && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={token} size={200} ref={qrRef} />
              </div>
              {generatedAt && (
                <p className="text-xs text-muted-foreground">
                  Terakhir diperbarui: {formatTime(generatedAt)}
                </p>
              )}
            </div>
          )}
          {!isLoading && noSchedule && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <WifiOff className="size-12 opacity-30" />
              <p className="text-sm">Tidak ada jadwal salat aktif saat ini.</p>
              <p className="text-xs">Kode QR akan otomatis muncul saat waktu salat tiba.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 w-full border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            Kode Manual Presensi
          </CardTitle>
          <CardDescription>untuk siswa yang tidak bisa scan qr (kamera rusak, dll)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {codeError ? (
            <p className="text-sm text-muted-foreground">{codeError}</p>
          ) : attendanceCode ? (
            <>
              <div className="rounded-xl border-2 border-dashed border-primary/40 bg-muted/30 px-8 py-4">
                <p className="text-4xl font-bold tracking-[0.3em] text-center font-mono">{attendanceCode}</p>
              </div>
              {codePrayer && <p className="text-sm font-medium text-primary">{codePrayer}</p>}
              <p className="text-xs text-muted-foreground">
                Kode berubah dalam <span className="font-semibold">{codeExpiresIn}</span> detik
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">menunggu jadwal salat aktif...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
