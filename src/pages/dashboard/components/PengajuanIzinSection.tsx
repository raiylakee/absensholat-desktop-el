import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Eye, ExternalLink, Paperclip, Search, CalendarIcon } from "lucide-react"
import { formatDateID } from "@/lib/date-utils"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
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
  approver_role?: string | null
  staff_approver?: {
    id_staff: number
    nama: string
  } | null
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
  if (status === "disetujui") return "bg-emerald-600 text-white"
  if (status === "ditolak") return "bg-red-600 text-white"
  return "bg-amber-600 text-white"
}

function formatKelas(siswa: PengajuanIzinItem["siswa"]): string {
  return siswa?.kelas || "-"
}

export function PengajuanIzinSection() {
  const [items, setItems] = useState<PengajuanIzinItem[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
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
    let result = statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((i) =>
        (i.siswa?.nis ?? "").toLowerCase().includes(q) ||
        (i.siswa?.nama_siswa ?? "").toLowerCase().includes(q) ||
        (i.siswa?.kelas ?? "").toLowerCase().includes(q)
      )
    }
    if (startDate) {
      const s = format(startDate, "yyyy-MM-dd")
      result = result.filter((i) => i.tanggal_awal?.slice(0, 10) >= s)
    }
    if (endDate) {
      const e = format(endDate, "yyyy-MM-dd")
      result = result.filter((i) => i.tanggal_akhir?.slice(0, 10) <= e)
    }
    return result
  }, [items, statusFilter, searchQuery, startDate, endDate])

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
              verifikasi pengajuan izin/sakit yang dikirim siswa.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari NIS, nama, kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className={cn("w-[130px] justify-start font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 size-4" />
                  {startDate ? formatDateID(startDate) : "Dari"}
                </Button>
              } />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus disabled={{ before: new Date() }} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className={cn("w-[130px] justify-start font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 size-4" />
                  {endDate ? formatDateID(endDate) : "Sampai"}
                </Button>
              } />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={{ before: startDate || new Date() }} />
              </PopoverContent>
            </Popover>
            <div className="min-w-[140px]">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-18rem)]">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">NIS</th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium">Tgl-Bulan-Tahun</th>
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
                        {formatDateID(item.tanggal_awal)} — {formatDateID(item.tanggal_akhir)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(item.status)}>
                          {item.status === "pending"
                            ? "Menunggu"
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
                  <p className="text-xs text-muted-foreground">jenis</p>
                  <p className="font-medium capitalize">{detail.jenis_izin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">periode</p>
                  <p className="font-medium">
                    {formatDateID(detail.tanggal_awal)} — {formatDateID(detail.tanggal_akhir)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">kelas</p>
                  <p className="font-medium">{formatKelas(detail.siswa)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">status</p>
                  <Badge className={statusBadgeClass(detail.status)}>
                    {detail.status === "pending"
                      ? "Menunggu"
                      : detail.status === "disetujui"
                      ? "Disetujui"
                      : "Ditolak"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">keterangan</p>
                <p className="whitespace-pre-wrap">{detail.keterangan}</p>
              </div>
              {detail.catatan_verifikasi ? (
                <div>
                  <p className="text-xs text-muted-foreground">catatan verifikasi</p>
                  <p className="whitespace-pre-wrap">{detail.catatan_verifikasi}</p>
                </div>
              ) : null}
              {detail.staff_approver && (
                <div>
                  <p className="text-xs text-muted-foreground">diverifikasi oleh</p>
                  <p className="font-medium">
                    {detail.staff_approver.nama}
                    {detail.approver_role && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({detail.approver_role === "wali_kelas" ? "Wali Kelas" : detail.approver_role === "admin" ? "Admin" : detail.approver_role})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {detail.bukti_foto_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">bukti</p>
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
