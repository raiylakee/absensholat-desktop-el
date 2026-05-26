import { useState, useEffect, useRef } from "react"
import { Smartphone, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { handleApiError } from "@/lib/api-utils"

type DeviceState = "loading" | "not-registered" | "registered" | "mismatch"

interface DeviceInfo {
  hardware_id: string
  device_name: string | null
  last_auth_at: string | null
}

export function UserDeviceCard() {
  const [state, setState] = useState<DeviceState>("loading")
  const [localHardwareId, setLocalHardwareId] = useState("")
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  const [registerLoading, setRegisterLoading] = useState(false)
  const [changeDialogOpen, setChangeDialogOpen] = useState(false)
  const [alasan, setAlasan] = useState("")
  const [changeLoading, setChangeLoading] = useState(false)
  const [unbindDialogOpen, setUnbindDialogOpen] = useState(false)
  const [unbindLoading, setUnbindLoading] = useState(false)

  const isMounted = useRef(true)

  const loadData = async () => {
    setState("loading")
    try {
      const [hwRes, infoRes] = await Promise.allSettled([
        window.electronAPI.getHardwareId(),
        window.electronAPI.getDeviceAuthInfo(),
      ])

      if (!isMounted.current) return

      const hwId = hwRes.status === "fulfilled" ? hwRes.value?.hardware_id ?? "" : ""
      setLocalHardwareId(hwId)

      if (infoRes.status === "rejected" || !infoRes.value) {
        setState("not-registered")
        return
      }

      const info = infoRes.value?.data ?? infoRes.value
      if (!info?.hardware_id) {
        setState("not-registered")
        return
      }

      setDeviceInfo({
        hardware_id: info.hardware_id,
        device_name: info.device_name ?? null,
        last_auth_at: info.last_auth_at ?? null,
      })

      if (hwId && info.hardware_id !== hwId) {
        setState("mismatch")
      } else {
        setState("registered")
      }
    } catch {
      if (isMounted.current) setState("not-registered")
    }
  }

  useEffect(() => {
    isMounted.current = true
    loadData()
    return () => { isMounted.current = false }
  }, [])

  const handleRegister = async () => {
    setRegisterLoading(true)
    try {
      await window.electronAPI.registerDeviceAuth()
      notify("Perangkat berhasil didaftarkan", "success")
      loadData()
    } catch (err: any) {
      notify(handleApiError(err) || "Gagal mendaftarkan perangkat", "error")
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleChangeRequest = async () => {
    if (!alasan.trim()) { notify("Alasan wajib diisi", "error"); return }
    setChangeLoading(true)
    try {
      await window.electronAPI.createDeviceChangeRequest({
        body: {
          alasan,
          old_hardware_id: deviceInfo?.hardware_id ?? "",
          new_hardware_id: localHardwareId,
        },
      })
      notify("Permintaan ganti perangkat berhasil diajukan", "success")
      setChangeDialogOpen(false)
      setAlasan("")
    } catch (err: any) {
      notify(handleApiError(err) || "Gagal mengajukan permintaan", "error")
    } finally {
      setChangeLoading(false)
    }
  }

  const handleUnbind = async () => {
    setUnbindLoading(true)
    try {
      await window.electronAPI.deleteProfileDevice()
      notify("Perangkat berhasil dilepas", "success")
      setUnbindDialogOpen(false)
      loadData()
    } catch (err: any) {
      notify(handleApiError(err) || "Gagal melepas perangkat", "error")
    } finally {
      setUnbindLoading(false)
    }
  }

  const truncate = (s: string, n = 24) => s.length > n ? `${s.slice(0, n)}…` : s

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5" /> Perangkat Terdaftar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        )}

        {state === "not-registered" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
              <AlertTriangle className="size-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Perangkat belum terdaftar</p>
                <p className="mt-1 text-yellow-700">Daftarkan perangkat ini agar absensi dapat diverifikasi secara hardware.</p>
              </div>
            </div>
            <Button onClick={handleRegister} disabled={registerLoading} className="self-start">
              {registerLoading ? <Spinner className="mr-2 size-4" /> : null}
              Daftarkan Perangkat Ini
            </Button>
          </div>
        )}

        {state === "registered" && deviceInfo && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
              <CheckCircle2 className="size-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Perangkat terdaftar</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Hardware ID</span>
                <span className="font-mono font-medium" title={deviceInfo.hardware_id}>{truncate(deviceInfo.hardware_id)}</span>
              </div>
              {deviceInfo.device_name && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nama Perangkat</span>
                  <span className="font-medium">{deviceInfo.device_name}</span>
                </div>
              )}
              {deviceInfo.last_auth_at && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Terakhir Auth</span>
                  <span className="font-medium">{new Date(deviceInfo.last_auth_at).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setChangeDialogOpen(true)}>
                Ajukan Ganti Perangkat
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setUnbindDialogOpen(true)}>
                Lepas Perangkat
              </Button>
            </div>
          </div>
        )}

        {state === "mismatch" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
              <XCircle className="size-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Perangkat tidak cocok</p>
                <p className="mt-1 text-red-700">
                  Perangkat yang terdaftar berbeda dengan perangkat ini. Ajukan permintaan ganti perangkat jika ini adalah perangkat baru Anda.
                </p>
              </div>
            </div>
            <Button onClick={() => setChangeDialogOpen(true)} className="self-start">
              Ajukan Ganti Perangkat
            </Button>
          </div>
        )}
      </CardContent>

      {/* Change Request Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={(o) => { setChangeDialogOpen(o); if (!o) setAlasan("") }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajukan Ganti Perangkat</DialogTitle>
            <DialogDescription>Berikan alasan penggantian perangkat. Admin akan meninjau permintaan ini.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Alasan <span className="text-destructive">*</span></Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Contoh: Perangkat lama rusak / hilang"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialogOpen(false)}>Batal</Button>
            <Button onClick={handleChangeRequest} disabled={changeLoading}>
              {changeLoading ? "Mengajukan..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unbind Confirm Dialog */}
      <Dialog open={unbindDialogOpen} onOpenChange={setUnbindDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Lepas Perangkat</DialogTitle>
            <DialogDescription>
              Yakin ingin melepas perangkat yang terdaftar? Anda perlu mendaftarkan ulang perangkat untuk menggunakan fitur hardware auth.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbindDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleUnbind} disabled={unbindLoading}>
              {unbindLoading ? "Memproses..." : "Lepas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
