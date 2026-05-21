import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Eye, ExternalLink, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { extractData } from "@/lib/api-utils"
import { notify } from "@/lib/notify"

interface PengajuanIzinItem {
  id_pengajuan: number
  id_siswa: number
  jenis_izin: "izin" | "sakit"
  status: "pending" | "disetujui" | "ditolak"
  tanggal_awal: string
  tanggal_akhir: string
  keterangan: string
  catatan_verifikasi?: string | null
  bukti_foto_url?: string | null
  created_at?: string
  reviewed_at?: string | null
  siswa?: {
    nis?: string
    nama_siswa?: string
    kelas?: string
    jurusan?: string
    part?: string
  }
}

const STATUS_FILTERS = [
  { value: "pending", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
  { value: "all", label: "Semua" },
] as const

function statusBadgeClass(status: PengajuanIzinItem["status"]) {
  if (status === "disetujui")
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
  if (status === "ditolak")
    return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
  return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
}

function formatKelas(siswa: PengajuanIzinItem["siswa"]): string {
  return siswa?.kelas || "-"
}

export function PengajuanIzinSection() {
  const [items, setItems] = useState<PengajuanIzinItem[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [detail, setDetail] = useState<PengajuanIzinItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PengajuanIzinItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isMounted = useRef(true)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const response: any = await window.electronAPI.getPengajuanIzin()
      const list = extractData<any[]>(response) ?? []
      if (!isMounted.current) return
      setItems(Array.isArray(list) ? list : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      notify(`Gagal mengambil pengajuan izin: ${message}`, "error")
      if (isMounted.current) setItems([])
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchItems()
    return () => {
      isMounted.current = false
    }
  }, [fetchItems])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items
    return items.filter((i) => i.status === statusFilter)
  }, [items, statusFilter])

  const handleApprove = useCallback(
    async (item: PengajuanIzinItem) => {
      setIsSubmitting(true)
      try {
        await window.electronAPI.updateIzinStatus({
          id: item.id_pengajuan,
          body: { status: "disetujui" },
        })
        notify("Pengajuan disetujui", "success")
        setDetail(null)
        await fetchItems()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        notify(`Gagal menyetujui pengajuan: ${message}`, "error")
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchItems]
  )

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return
    const reason = rejectReason.trim()
    if (reason.length < 3) {
      notify("Catatan penolakan wajib diisi", "error")
      return
    }
    setIsSubmitting(true)
    try {
      await window.electronAPI.updateIzinStatus({
        id: rejectTarget.id_pengajuan,
        body: { status: "ditolak", catatan_verifikasi: reason },
      })
      notify("Pengajuan ditolak", "success")
      setRejectTarget(null)
      setRejectReason("")
      setDetail(null)
      await fetchItems()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      notify(`Gagal menolak pengajuan: ${message}`, "error")
    } finally {
      setIsSubmitting(false)
    }
  }, [rejectTarget, rejectReason, fetchItems])

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Pengajuan Izin</CardTitle>
            <CardDescription>
              Verifikasi pengajuan izin/sakit yang dikirim siswa.
            </CardDescription>
          </div>
          <div className="min-w-[180px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">NIS</th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium">Periode</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <Spinner className="mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada pengajuan
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id_pengajuan} className="border-t">
                      <td className="px-4 py-3 font-medium">{item.siswa?.nis ?? "-"}</td>
                      <td className="px-4 py-3">{item.siswa?.nama_siswa ?? "-"}</td>
                      <td className="px-4 py-3">{formatKelas(item.siswa)}</td>
                      <td className="px-4 py-3 capitalize">{item.jenis_izin}</td>
                      <td className="px-4 py-3">
                        {item.tanggal_awal?.slice(0, 10)} — {item.tanggal_akhir?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(item.status)}>
                          {item.status === "pending"
                            ? "Pending"
                            : item.status === "disetujui"
                            ? "Disetujui"
                            : "Ditolak"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => setDetail(item)}>
                          <Eye className="mr-2 size-4" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan Izin</DialogTitle>
            <DialogDescription>
              {detail?.siswa?.nama_siswa} • {detail?.siswa?.nis}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Jenis</p>
                  <p className="font-medium capitalize">{detail.jenis_izin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Periode</p>
                  <p className="font-medium">
                    {detail.tanggal_awal?.slice(0, 10)} — {detail.tanggal_akhir?.slice(0, 10)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kelas</p>
                  <p className="font-medium">{formatKelas(detail.siswa)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={statusBadgeClass(detail.status)}>
                    {detail.status === "pending"
                      ? "Pending"
                      : detail.status === "disetujui"
                      ? "Disetujui"
                      : "Ditolak"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Keterangan</p>
                <p className="whitespace-pre-wrap">{detail.keterangan}</p>
              </div>
              {detail.catatan_verifikasi ? (
                <div>
                  <p className="text-xs text-muted-foreground">Catatan Verifikasi</p>
                  <p className="whitespace-pre-wrap">{detail.catatan_verifikasi}</p>
                </div>
              ) : null}
              {detail.bukti_foto_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Bukti</p>
                  {detail.bukti_foto_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={detail.bukti_foto_url}
                      alt="Bukti izin"
                      className="max-h-64 w-full rounded-lg border object-contain"
                    />
                  ) : null}
                  <a
                    href={detail.bukti_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
                  >
                    <ExternalLink className="size-3" />
                    Buka file bukti
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="size-3" />
                  Tidak ada bukti terlampir
                </div>
              )}
            </div>
          )}
          {detail?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(detail)
                  setRejectReason("")
                }}
                disabled={isSubmitting}
              >
                Tolak
              </Button>
              <Button onClick={() => handleApprove(detail)} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Setujui"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan untuk siswa.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Alasan penolakan..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Tolak Pengajuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
