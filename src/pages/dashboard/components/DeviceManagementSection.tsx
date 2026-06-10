import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { MonitorSmartphone, Trash2, Check, X } from "lucide-react"
import { notify } from "@/lib/notify"
import { extractData, handleApiError } from "@/lib/api-utils"
import { formatDateTimeID } from "@/lib/date-utils"

interface Device {
  id: number
  account_id: number
  email: string
  user_name: string
  role: string
  hardware_id: string
  device_name: string
  device_model: string
  is_verified: boolean
  last_auth_at: string
  created_at: string
}

interface ChangeRequest {
  id: number
  account_id: number
  old_hardware_id: string
  new_hardware_id: string
  alasan: string
  status: string
  created_at: string
  account?: { id: number; email: string; role: string }
}

export function DeviceManagementSection() {
  const [devices, setDevices] = useState<Device[]>([])
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<"devices" | "requests">("devices")
  const isMounted = useRef(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [devRes, reqRes] = await Promise.all([
        window.electronAPI.getAdminDevices(),
        window.electronAPI.getDeviceChangeRequests(),
      ])
      if (!isMounted.current) return
      setDevices(extractData<Device[]>(devRes) ?? [])
      const allRequests = extractData<ChangeRequest[]>(reqRes) ?? []
      setRequests(allRequests.filter(r => r.status === "pending"))
    } catch {
      // Endpoints may not exist yet
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchData()
    return () => { isMounted.current = false }
  }, [])

  const handleUnbind = async (id: number) => {
    try {
      await window.electronAPI.deleteAdminDevice({ id })
      notify("Perangkat berhasil dilepas", "success")
      setDevices(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      notify("Gagal melepas: " + handleApiError(err), "error")
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await window.electronAPI.approveDeviceChange({ id })
      notify("Pengajuan disetujui", "success")
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      notify("Gagal: " + handleApiError(err), "error")
    }
  }

  const handleReject = async (id: number) => {
    try {
      await window.electronAPI.rejectDeviceChange({ id })
      notify("Pengajuan ditolak", "success")
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      notify("Gagal: " + handleApiError(err), "error")
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={tab === "devices" ? "default" : "outline"} onClick={() => setTab("devices")}>
          Perangkat Terdaftar ({devices.length})
        </Button>
        <Button variant={tab === "requests" ? "default" : "outline"} onClick={() => setTab("requests")}>
          Pengajuan Ganti ({requests.length})
        </Button>
      </div>

      {tab === "devices" && (
        <Card>
          <CardHeader>
            <CardTitle>Manajemen Perangkat</CardTitle>
            <CardDescription>daftar semua perangkat yang terdaftar di sistem</CardDescription>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada perangkat terdaftar</p>
            ) : (
              <div className="space-y-3">
                {devices.map(d => (
                  <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border">
                    <MonitorSmartphone className="size-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.user_name || d.email}</span>
                        <Badge variant="outline" className="text-[10px]">{d.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.device_name || d.device_model || d.hardware_id}</p>
                      <p className="text-xs text-muted-foreground">terakhir: {d.last_auth_at ? formatDateTimeID(d.last_auth_at) : "-"}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleUnbind(d.id)}>
                      <Trash2 className="size-4 mr-1" /> Lepas
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "requests" && (
        <Card>
          <CardHeader>
            <CardTitle>Pengajuan Ganti Perangkat</CardTitle>
            <CardDescription>permintaan pergantian perangkat dari pengguna</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada pengajuan tertunda</p>
            ) : (
              <div className="space-y-3">
                {requests.map(r => (
                  <div key={r.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{r.account?.email || `Account #${r.account_id}`}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{r.account?.role}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Alasan: {r.alasan}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {r.old_hardware_id?.slice(0, 8)}... → {r.new_hardware_id?.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApprove(r.id)}>
                        <Check className="size-4 mr-1" /> Setujui
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                        <X className="size-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
