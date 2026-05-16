import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Stethoscope, Briefcase, Paperclip, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { notify } from "@/lib/notify"
import { extractData } from "@/lib/api-utils"

interface PengajuanIzin {
  id_pengajuan: number
  jenis_izin: string
  status: string
  tanggal_awal: string
  tanggal_akhir: string
  keterangan: string
  created_at: string
  bukti_foto_url?: string
  catatan_verifikasi?: string | null
}

export function SiswaPermitSection() {
  const [permitType, setPermitType] = useState("sakit")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requests, setRequests] = useState<PengajuanIzin[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const isMounted = useRef(true)

  const fetchRequests = async () => {
    setIsLoadingHistory(true)
    try {
      const response: any = await window.electronAPI.getPengajuanIzin()
      if (!isMounted.current) return
      setRequests(extractData<PengajuanIzin[]>(response) ?? [])
    } catch {
      if (isMounted.current) setRequests([])
    } finally {
      if (isMounted.current) setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchRequests()
    return () => { isMounted.current = false }
  }, [])

  const handlePickFile = async () => {
    try {
      const selected = await window.electronAPI.showOpenDialog({
        multiple: false,
        filters: [{ name: "Bukti", extensions: ["jpg", "jpeg", "png", "pdf"] }],
      })
      if (selected && typeof selected === "string") {
        setFilePath(selected)
        setFileName(selected.split(/[\\/]/).pop() ?? selected)
      }
    } catch {
      notify("Gagal membuka file picker", "error")
    }
  }

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo || reason.trim().length < 10) {
      notify("Lengkapi semua field (alasan minimal 10 karakter)", "error")
      return
    }
    if (dateTo < dateFrom) {
      notify("Tanggal selesai tidak boleh sebelum tanggal mulai", "error")
      return
    }
    setIsSubmitting(true)
    try {
      await window.electronAPI.createPengajuanIzin({
        jenisIzin: permitType,
        tanggalAwal: format(dateFrom, "yyyy-MM-dd"),
        tanggalAkhir: format(dateTo, "yyyy-MM-dd"),
        keterangan: reason.trim(),
        filePath: filePath ?? null,
      })
      notify("Pengajuan izin berhasil dikirim", "success")
      setReason("")
      setDateFrom(undefined)
      setDateTo(undefined)
      setFilePath(null)
      setFileName(null)
      await fetchRequests()
    } catch (err) {
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : String(err)
      notify("Gagal mengirim pengajuan: " + msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "disetujui") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Disetujui</Badge>
    if (status === "ditolak") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Ditolak</Badge>
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Menunggu</Badge>
  }

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd MMM yyyy") } catch { return d }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Pengajuan Izin / Sakit</CardTitle>
          <CardDescription>Lengkapi formulir di bawah ini untuk mengajukan permohonan ketidakhadiran</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Jenis Izin</Label>
            <RadioGroup value={permitType} onValueChange={setPermitType} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="sakit" id="sakit" className="peer sr-only" />
                <Label htmlFor="sakit" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[checked]:border-primary peer-data-[checked]:bg-primary/5">
                  <Stethoscope className="mb-3 size-6 text-primary" />
                  <span className="font-semibold">Sakit</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="izin" id="izin" className="peer sr-only" />
                <Label htmlFor="izin" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[checked]:border-primary peer-data-[checked]:bg-primary/5">
                  <Briefcase className="mb-3 size-6 text-primary" />
                  <span className="font-semibold">Izin</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Popover>
                <PopoverTrigger render={
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 px-3", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                } />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Popover>
                <PopoverTrigger render={
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 px-3", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                } />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Alasan (min. 10 karakter)</Label>
            <Textarea
              id="reason"
              placeholder="Tuliskan alasan detail ketidakhadiran Anda..."
              className="min-h-[120px] resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bukti (opsional)</Label>
            {fileName ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <Paperclip className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={() => { setFilePath(null); setFileName(null) }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Hapus file"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={handlePickFile}>
                <Paperclip className="mr-2 size-4" />
                Lampirkan Surat / Foto
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Format: JPG, PNG, atau PDF. Maks 5 MB.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setReason(""); setDateFrom(undefined); setDateTo(undefined); setFilePath(null); setFileName(null) }}>Batal</Button>
            <Button className="px-8" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              Kirim Pengajuan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Pengajuan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengajuan</p>
          ) : (
            requests.map((req) => (
              <div key={req.id_pengajuan} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm capitalize">{req.jenis_izin}</span>
                  {getStatusBadge(req.status)}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{req.keterangan}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3" />
                  <span>{formatDate(req.tanggal_awal)} - {formatDate(req.tanggal_akhir)}</span>
                </div>
                {req.bukti_foto_url && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Paperclip className="size-3" />
                    <span>Bukti terlampir</span>
                  </div>
                )}
                {req.status === "ditolak" && req.catatan_verifikasi && (
                  <p className="text-xs text-red-600 mt-1">Alasan: {req.catatan_verifikasi}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
