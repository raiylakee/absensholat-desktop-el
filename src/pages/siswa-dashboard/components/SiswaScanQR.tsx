import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, CheckCircle2, RefreshCw, Camera, CameraOff, Keyboard } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { handleApiError } from "@/lib/api-utils"
import { formatDateID } from "@/lib/date-utils"
import type { UserProfileData } from "@/lib/auth-session"

type ScanMode = "camera" | "manual"
type VerifyState = "idle" | "scanning" | "verifying" | "success" | "error"

export function SiswaScanQR({ user }: { user?: UserProfileData }) {
  const [mode, setMode] = useState<ScanMode>("camera")
  const [state, setState] = useState<VerifyState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [prayerName, setPrayerName] = useState<string | null>(null)
  const [prayerDate, setPrayerDate] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [isCameraError, setIsCameraError] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = "qr-scanner-container"

  const verifyToken = useCallback(async (token: string) => {
    setState("verifying")
    setPrayerName(null)
    setPrayerDate(null)
    setErrorMessage(null)
    try {
      const response: any = await window.electronAPI.verifyQr({ body: { token } })
      setState("success")
      setPrayerName(response?.data?.jenis_sholat ?? null)
      setPrayerDate(response?.data?.tanggal ?? null)
    } catch (err: any) {
      setState("error")
      const msg = handleApiError(err)
      if (msg.includes("Perangkat tidak sesuai") || msg.includes("DEVICE_MISMATCH")) {
        setErrorMessage("Perangkat ini tidak terdaftar. Hubungi admin untuk mendaftarkan perangkat Anda.")
      } else {
        setErrorMessage(msg)
      }
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return
    const scanner = new Html5Qrcode(scannerContainerId)
    // Assign ref only after we know start() will be called, but track
    // whether start() actually succeeded so stopCamera doesn't call stop()
    // on a scanner that never started.
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          scannerRef.current = null
          setCameraActive(false)
          verifyToken(decodedText)
        },
        () => {}
      )
      scannerRef.current = scanner
      setCameraActive(true)
    } catch (err) {
      // scanner.start() failed — do NOT assign ref, nothing to stop
      const msg = handleApiError(err)
      setIsCameraError(true)
      if (msg.includes("NotAllowedError") || msg.includes("not allowed")) {
        setErrorMessage("Izin kamera ditolak. Berikan izin kamera di pengaturan browser/sistem.")
      } else {
        setErrorMessage("Gagal mengakses kamera. Pastikan izin kamera diberikan.")
      }
      setState("error")
    }
  }, [verifyToken])

  const stopCamera = useCallback(() => {
    const scanner = scannerRef.current
    if (!scanner) return
    scannerRef.current = null
    setCameraActive(false)
    scanner.stop().catch(() => {})
  }, [])

  // Transition idle → scanning when in camera mode (after DOM commit)
  useEffect(() => {
    if (mode === "camera" && state === "idle") {
      setState("scanning")
    }
  }, [mode, state])

  // Start camera only after the scanner container is in the DOM (state === "scanning")
  useEffect(() => {
    if (mode === "camera" && state === "scanning") {
      startCamera()
    }
    return () => { stopCamera() }
  }, [mode, state, startCamera, stopCamera])

  const verifyCode = useCallback(async (code: string) => {
    setState("verifying")
    setErrorMessage(null)
    try {
      const response: any = await window.electronAPI.verifyAttendanceCode({ body: { code } })
      setState("success")
      setPrayerName(response?.data?.jenis_sholat ?? null)
      setPrayerDate(response?.data?.tanggal ?? null)
    } catch (err: any) {
      setState("error")
      const msg = handleApiError(err)
      if (msg.includes("Perangkat tidak sesuai") || msg.includes("DEVICE_MISMATCH")) {
        setErrorMessage("Perangkat ini tidak terdaftar. Hubungi admin untuk mendaftarkan perangkat Anda.")
      } else {
        setErrorMessage(msg)
      }
    }
  }, [])

  const handleManualVerify = () => {
    if (!manualInput.trim()) return
    verifyCode(manualInput.trim())
  }

  const handleReset = () => {
    setErrorMessage(null)
    setPrayerName(null)
    setPrayerDate(null)
    setManualInput("")
    setIsCameraError(false)
    setState("idle")
  }

  const switchMode = (newMode: ScanMode) => {
    stopCamera()
    setState("idle")
    setErrorMessage(null)
    setMode(newMode)
  }

  const title = "Pindai Kode QR Presensi"
  const subtitle = "arahkan kamera ke kode qr atau masukkan kode presensi secara manual"

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {/* Camera/manual mode toggle */}
      <div className="flex gap-2 p-1 rounded-lg bg-muted/50 border">
        <Button
          variant={mode === "camera" ? "default" : "ghost"}
          size="sm"
          onClick={() => switchMode("camera")}
          className="gap-2"
        >
          <Camera className="size-4" />
          Kamera
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "ghost"}
          size="sm"
          onClick={() => switchMode("manual")}
          className="gap-2"
        >
          <Keyboard className="size-4" />
          Manual
        </Button>
      </div>

      <Card className="w-full max-w-md border border-muted bg-card">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[350px] gap-6">
          {/* Success state */}
          {state === "success" && (
            <div className="flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-300">
              <div className="size-24 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="size-12 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-xl">Presensi Berhasil!</p>
                {prayerName && <p className="text-sm font-medium">Sholat: {prayerName}</p>}
                {prayerDate && <p className="text-sm text-muted-foreground">tanggal: {formatDateID(prayerDate)}</p>}
              </div>
              <Button variant="outline" className="mt-4" onClick={handleReset}>
                <RefreshCw className="mr-2 size-4" />
                Scan Lagi
              </Button>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-300">
              <div className="size-24 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="size-12 text-red-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-xl">Verifikasi Gagal</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {errorMessage ?? "Token tidak valid atau sudah kedaluwarsa."}
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
                {isCameraError ? (
                  <Button onClick={() => switchMode("manual")} className="gap-2">
                    <Keyboard className="size-4" />
                    Gunakan Input Manual
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="mr-2 size-4" />
                    Coba Lagi
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Verifying state */}
          {state === "verifying" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">memverifikasi presensi...</p>
            </div>
          )}

          {/* Camera mode - scanning */}
          {mode === "camera" && (state === "idle" || state === "scanning") && (
            <div className="w-full flex flex-col items-center gap-4">
              <div
                id={scannerContainerId}
                className="w-full max-w-[300px] aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-black relative"
              />
              {!cameraActive && state === "scanning" && (
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="sm" />
                  <p className="text-xs text-muted-foreground">mengaktifkan kamera...</p>
                </div>
              )}
              {cameraActive && (
                <p className="text-xs text-muted-foreground text-center">
                  Arahkan kamera ke Kode QR presensi
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={() => switchMode("manual")} className="gap-2 text-muted-foreground">
                <CameraOff className="size-3" />
                Matikan Kamera
              </Button>
            </div>
          )}

          {/* Manual mode */}
          {mode === "manual" && (state === "idle") && (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-token">Masukkan Kode Presensi</Label>
                <Input
                  id="manual-token"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Masukkan 6 digit kode..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualInput.trim().length === 6) handleManualVerify()
                  }}
                  className="h-12 text-center font-mono text-2xl tracking-[0.3em]"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Minta kode 6 digit dari guru/admin
                </p>
              </div>
              <Button className="w-full" onClick={handleManualVerify} disabled={manualInput.trim().length !== 6}>
                Verifikasi Presensi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
