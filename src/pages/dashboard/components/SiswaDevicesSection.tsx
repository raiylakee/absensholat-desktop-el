import { useState, useEffect, useRef } from "react"
import { Search, Trash2, MonitorSmartphone, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData } from "@/lib/api-utils"

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

export function SiswaDevicesSection() {
  const [devices, setDevices] = useState<Device[]>([])
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<"devices" | "requests">("devices")
  const isMounted = useRef(true)

  const fetchDevices = async () => {
    setIsLoading(true)
    try {
      const res = await window.electronAPI.getAdminDevices({ role: "siswa", search: search || undefined })
      if (!isMounted.current) return
      setDevices(extractData<Device[]>(res) ?? [])
    } catch {
      if (isMounted.current) setDevices([])
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await window.electronAPI.getDeviceChangeRequests()
      if (!isMounted.current) return
      const all = extractData<ChangeRequest[]>(res) ?? []
      setRequests(all.filter(r => r.status === "pending" && r.account?.role === "siswa"))
    } catch {}
  }

  useEffect(() => {
    isMounted.current = true
    fetchDevices()
    fetchRequests()
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchDevices(), 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleUnbind = async (id: number) => {
    try {
      await window.electronAPI.deleteAdminDevice({ id })
      notify("Perangkat siswa berhasil di-unbind", "success")
      setDevices(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      notify("Gagal unbind: " + (err.message || err), "error")
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await window.electronAPI.approveDeviceChange({ id })
      notify("Pengajuan disetujui", "success")
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      notify("Gagal: " + (err.message || err), "error")
    }
  }

  const handleReject = async (id: number) => {
    try {
      await window.electronAPI.rejectDeviceChange({ id })
      notify("Pengajuan ditolak", "success")
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      notify("Gagal: " + (err.message || err), "error")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-5" />
            Perangkat Siswa
          </CardTitle>
          <CardDescription>Kelola perangkat yang terdaftar untuk siswa. Unbind perangkat jika siswa perlu ganti HP.</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-2">
        <Button variant={tab === "devices" ? "default" : "outline"} onClick={() => setTab("devices")}>
          Perangkat ({devices.length})
        </Button>
        <Button variant={tab === "requests" ? "default" : "outline"} onClick={() => setTab("requests")}>
          Pengajuan Ganti ({requests.length})
        </Button>
      </div>

      {tab === "devices" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email siswa..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center"><Spinner size="lg" /></div>
          ) : devices.length === 0 ? (
            <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
              {search ? "Tidak ada perangkat siswa yang cocok." : "Belum ada perangkat siswa terdaftar."}
            </div>
          ) : (
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Nama Siswa</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Perangkat</th>
                      <th className="px-4 py-3 text-left font-medium">Terakhir Aktif</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(d => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{d.user_name || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{d.device_name || d.device_model || d.hardware_id.slice(0, 12) + "..."}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {d.last_auth_at ? new Date(d.last_auth_at).toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={d.is_verified ? "default" : "secondary"} className="text-[10px]">
                            {d.is_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="destructive" size="sm" onClick={() => handleUnbind(d.id)}>
                            <Trash2 className="size-3.5 mr-1" /> Unbind
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
              Tidak ada pengajuan ganti perangkat dari siswa.
            </div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="flex items-start gap-4 p-4 rounded-lg border bg-background">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{r.account?.email || `Account #${r.account_id}`}</span>
                  <p className="text-xs text-muted-foreground mt-1">Alasan: {r.alasan}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {r.old_hardware_id?.slice(0, 12)}... → {r.new_hardware_id?.slice(0, 12)}...
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(r.id)}>
                    <Check className="size-3.5 mr-1" /> Setujui
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                    <X className="size-3.5 mr-1" /> Tolak
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
