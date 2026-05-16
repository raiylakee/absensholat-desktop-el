import { useState, useCallback, useEffect, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw, Keyboard } from "lucide-react"
import { notify } from "@/lib/notify"

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${hours}:${minutes}:${seconds}`
}

export function QRGeneratorSection() {
  const [token, setToken] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Attendance code state
  const [attendanceCode, setAttendanceCode] = useState<string | null>(null)
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0)
  const [codePrayer, setCodePrayer] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generateQR = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await window.electronAPI.generateQrToken() as { data?: { token?: string }; token?: string }
      const qrToken = response?.data?.token ?? response?.token ?? (typeof response === "string" ? response : null)
      if (!qrToken) throw new Error("Token tidak ditemukan dalam respons")
      setToken(qrToken as string)
      setGeneratedAt(new Date())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify(`Gagal membuat QR Code: ${message}`, "error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAttendanceCode = useCallback(async () => {
    try {
      const response: any = await window.electronAPI.generateAttendanceCode()
      const data = response?.data ?? response
      setAttendanceCode(data?.code ?? null)
      setCodeExpiresIn(data?.expires_in ?? 0)
      setCodePrayer(data?.jenis_sholat ?? null)
      setCodeError(null)
    } catch (err) {
      setAttendanceCode(null)
      setCodeError(typeof err === "string" ? err : "Tidak ada jadwal sholat aktif")
    }
  }, [])

  // Auto-refresh attendance code every time it expires
  useEffect(() => {
    if (!token) return // Only start after QR is generated

    fetchAttendanceCode()
    timerRef.current = setInterval(fetchAttendanceCode, 20_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [token, fetchAttendanceCode])

  // Countdown timer for code expiry
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
          <CardTitle>QR Code Presensi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Membuat QR Code...</p>
            </div>
          )}

          {!isLoading && token && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={token} size={200} />
              </div>
              {generatedAt && (
                <p className="text-sm text-muted-foreground">
                  Dibuat pada: {formatTime(generatedAt)}
                </p>
              )}
            </div>
          )}

          {!isLoading && !token && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah untuk membuat QR Code presensi.
              </p>
            </div>
          )}

          <Button onClick={generateQR} disabled={isLoading} className="gap-2">
            <RefreshCw className="size-4" />
            {token ? "Regenerate" : "Generate QR Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Code Card - shown after QR is generated */}
      {token && (
        <Card className="mt-6 w-full border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="size-5" />
              Kode Manual Presensi
            </CardTitle>
            <CardDescription>
              Untuk siswa yang tidak bisa scan QR (kamera rusak, dll)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {codeError ? (
              <p className="text-sm text-muted-foreground">{codeError}</p>
            ) : attendanceCode ? (
              <>
                <div className="rounded-xl border-2 border-dashed border-primary/40 bg-muted/30 px-8 py-4">
                  <p className="text-4xl font-bold tracking-[0.3em] text-center font-mono">
                    {attendanceCode}
                  </p>
                </div>
                {codePrayer && (
                  <p className="text-sm font-medium text-primary">{codePrayer}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Kode berubah dalam <span className="font-semibold">{codeExpiresIn}</span> detik
                </p>
              </>
            ) : (
              <Spinner size="sm" />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
