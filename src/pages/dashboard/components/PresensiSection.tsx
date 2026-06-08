import { useMemo, useState, useEffect, useRef } from "react"
import { Eye, Filter, Paperclip, Printer, CalendarIcon, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { PresensiRecord } from "@/pages/dashboard/types"
import { notify } from "@/lib/notify"
import { extractData, normalizeAttendance } from "@/lib/api-utils"
import { usePrintAction } from "@/hooks/use-print-action"
import { PrintHeader } from "@/components/print-header"
import { BuktiFotoPreview } from "@/components/bukti-foto-preview"
import { useDownloadAction } from "@/hooks/use-download-action"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"

interface IzinDetail {
  id_pengajuan: number
  jenis_izin: string
  keterangan: string
  tanggal_awal: string
  tanggal_akhir: string
  bukti_foto_url?: string
  status?: string
  catatan_verifikasi?: string | null
}

interface PresensiSectionProps {
  forcedClass?: string
}

export function PresensiSection({ forcedClass }: PresensiSectionProps) {
  const { print } = usePrintAction()
  const { isDownloading, download } = useDownloadAction()
  const [presensiRecords, setPresensiRecords] = useState<PresensiRecord[]>([])
  const [prayerTypes, setPrayerTypes] = useState<string[]>([])
  const [majorOptions, setMajorOptions] = useState<string[]>([])
  const [allClassOptions, setAllClassOptions] = useState<any[]>([])
  const [presensiSearchQuery, setPresensiSearchQuery] = useState("")
  const [selectedSholatFilters, setSelectedSholatFilters] = useState<PresensiRecord["jenisSholat"][]>([])
  const [selectedPresensiJurusanFilters, setSelectedPresensiJurusanFilters] = useState<string[]>([])
  const [selectedPresensiKelasFilters, setSelectedPresensiKelasFilters] = useState<string[]>([])
  const [dateRangeType, setDateRangeType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [detailPresensi, setDetailPresensi] = useState<PresensiRecord | null>(null)
  const [izinDetail, setIzinDetail] = useState<IzinDetail | null>(null)
  const [isLoadingIzin, setIsLoadingIzin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 50
  const isMounted = useRef(true)

  const presensiClassOptions = useMemo(() => {
    if (selectedPresensiJurusanFilters.length === 0) return []
    const selectedJurusan = selectedPresensiJurusanFilters[0]
    return Array.from(
      new Set(
        allClassOptions
          .filter((c: any) => c.jurusan === selectedJurusan)
          .map((c: any) => c.label)
      )
    )
  }, [allClassOptions, selectedPresensiJurusanFilters])

  const filteredRecords = useMemo(() => {
    return presensiRecords.filter(record => {
      const matchSholat = selectedSholatFilters.length === 0 || selectedSholatFilters.includes(record.jenisSholat as any)
      const matchKelas = selectedPresensiKelasFilters.length === 0 || selectedPresensiKelasFilters.includes(record.kelas)
      const matchForcedClass = !forcedClass || record.kelas === forcedClass
      const matchSearch = !presensiSearchQuery || 
        record.nama.toLowerCase().includes(presensiSearchQuery.toLowerCase()) ||
        record.nis.toLowerCase().includes(presensiSearchQuery.toLowerCase())
      return matchSholat && matchKelas && matchForcedClass && matchSearch
    })
  }, [presensiRecords, selectedSholatFilters, selectedPresensiKelasFilters, forcedClass, presensiSearchQuery])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      let start_date: string | undefined = undefined
      let end_date: string | undefined = undefined

      if (dateRangeType === "today") {
        const now = new Date()
        start_date = format(now, "yyyy-MM-dd")
        end_date = format(now, "yyyy-MM-dd")
      } else if (dateRangeType === "week") {
        const now = new Date()
        start_date = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
        end_date = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
      } else if (dateRangeType === "month") {
        const now = new Date()
        start_date = format(startOfMonth(now), "yyyy-MM-dd")
        end_date = format(endOfMonth(now), "yyyy-MM-dd")
      } else if (dateRangeType === "custom") {
        if (customStartDate) start_date = format(customStartDate, "yyyy-MM-dd")
        if (customEndDate) end_date = format(customEndDate, "yyyy-MM-dd")
      }

      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: presensiSearchQuery || undefined,
        kelas: forcedClass || selectedPresensiKelasFilters[0] || undefined,
        jurusan: selectedPresensiJurusanFilters.length > 0 ? selectedPresensiJurusanFilters[0] : undefined,
        start_date,
        end_date,
      }
      const response: any = await window.electronAPI.getAttendanceHistory(params)
      const wrapper: any = extractData(response);
      const absensi = wrapper?.absensi ?? wrapper ?? [];
      const mapped: PresensiRecord[] = Array.isArray(absensi) ? absensi.map((item: any) => normalizeAttendance(item) as PresensiRecord) : [];
      if (!isMounted.current) return
      setPresensiRecords(mapped)
      const pagination = wrapper?.pagination ?? {};
      setTotalPages(pagination.total_pages ?? 1);
      setTotalItems(pagination.total_items ?? mapped.length);
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil riwayat:", error)
      notify("Gagal mengambil riwayat presensi", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  // Fetch static data on mount
  useEffect(() => {
    isMounted.current = true
    window.electronAPI.getPrayerTypes().then((res: any) => {
      const types: any[] = extractData(res) ?? []
      if (isMounted.current) setPrayerTypes(types.map(t => t.nama_jenis))
    })
    window.electronAPI.getMajors().then((res: any) => {
      const majors: any[] = extractData(res) ?? []
      if (isMounted.current && majors.length > 0) setMajorOptions(majors.map(m => m.nama_jurusan))
    })
    window.electronAPI.getClasses().then((res: any) => {
      const classes: any[] = extractData(res) ?? []
      if (isMounted.current) setAllClassOptions(classes)
    })
    return () => { isMounted.current = false }
  }, [])

  // Debounced fetch when filters/search changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        fetchHistory()
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [presensiSearchQuery, selectedPresensiJurusanFilters, selectedPresensiKelasFilters, forcedClass, dateRangeType, customStartDate, customEndDate])

  // Fetch when currentPage changes
  useEffect(() => {
    fetchHistory()
  }, [currentPage])

  const handleOpenDetail = async (record: PresensiRecord) => {
    setDetailPresensi(record)
    setIzinDetail(null)
    // Try to find the izin record for this student+date
    if (record.status === "Izin" || record.status === "Sakit") {
      setIsLoadingIzin(true)
      try {
        const response: any = await window.electronAPI.getPengajuanIzin()
        const list: any[] = extractData<any[]>(response) ?? []
        const tanggal = record.tanggal
        const match = list.find((item: any) => {
          const nis = item.siswa?.nis ?? ""
          const awal = item.tanggal_awal?.slice(0, 10)
          const akhir = item.tanggal_akhir?.slice(0, 10)
          return nis === record.nis && !!tanggal && !!awal && !!akhir && tanggal >= awal && tanggal <= akhir
        })
        if (match) {
          setIzinDetail({
            id_pengajuan: match.id_pengajuan,
            jenis_izin: match.jenis_izin,
            keterangan: match.keterangan,
            tanggal_awal: match.tanggal_awal,
            tanggal_akhir: match.tanggal_akhir,
            bukti_foto_url: match.bukti_foto_url,
            status: match.status,
            catatan_verifikasi: match.catatan_verifikasi,
          })
        }
      } catch {
        // non-critical, just show without izin detail
      } finally {
        setIsLoadingIzin(false)
      }
    }
  }

  const getStatusBadgeClassName = (status: string) => {
    if (status === "Hadir") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
    if (status === "Izin") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
    if (status === "Sakit") return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
    if (status === "Alpha") return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
    return "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400"
  }

  const handleDownloadBukti = async () => {
    if (!izinDetail?.bukti_foto_url) return

    const buktiUrl = izinDetail.bukti_foto_url

    // Extract filename from URL if available, fallback to bukti-izin-{YYYY-MM-DD}.{ext}
    const urlPath = buktiUrl.split("?")[0]
    const urlFilename = urlPath.split("/").pop() ?? ""
    const hasOriginalFilename = urlFilename.includes(".")

    // Determine extension from URL
    const extMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/)
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg"

    // Determine format for filename generator (fallback filename)
    const format = (ext === "pdf" ? "pdf" : "png") as "pdf" | "png"

    // Use the date from izin period (tanggal_awal) for the fallback filename
    const izinDate = izinDetail.tanggal_awal
      ? new Date(izinDetail.tanggal_awal)
      : new Date()

    await download({
      filenameOptions: {
        dataType: "bukti-izin",
        format,
        date: izinDate,
      },
      // Use original filename from URL as default if available
      ...(hasOriginalFilename ? { defaultPathOverride: urlFilename } : {}),
      fetchData: async () => {
        const response = await fetch(buktiUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        let binary = ""
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binary)
        return { data: base64, encoding: "base64" as const }
      },
      dialogFilters: [
        { name: "File Gambar", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        { name: "File PDF", extensions: ["pdf"] },
        { name: "Semua File", extensions: ["*"] },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lihat Presensi</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border bg-muted p-1 text-muted-foreground">
                <Button
                  variant={dateRangeType === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => {
                    setDateRangeType("all")
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                    setCurrentPage(1)
                  }}
                >
                  Semua
                </Button>
                <Button
                  variant={dateRangeType === "today" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => {
                    setDateRangeType("today")
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                    setCurrentPage(1)
                  }}
                >
                  Hari Ini
                </Button>
                <Button
                  variant={dateRangeType === "week" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => {
                    setDateRangeType("week")
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                    setCurrentPage(1)
                  }}
                >
                  Minggu Ini
                </Button>
                <Button
                  variant={dateRangeType === "month" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => {
                    setDateRangeType("month")
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                    setCurrentPage(1)
                  }}
                >
                  Bulan Ini
                </Button>
                <Button
                  variant={dateRangeType === "custom" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => {
                    setDateRangeType("custom")
                    setCurrentPage(1)
                  }}
                >
                  Kustom
                </Button>
              </div>
              {dateRangeType === "custom" && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-xs justify-start font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 size-3.5" />
                          {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Dari tanggal"}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate ?? undefined}
                        onSelect={(d) => {
                          setCustomStartDate(d ?? null)
                          setCurrentPage(1)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">—</span>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-xs justify-start font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 size-3.5" />
                          {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Sampai tanggal"}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate ?? undefined}
                        onSelect={(d) => {
                          setCustomEndDate(d ?? null)
                          setCurrentPage(1)
                        }}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setCustomStartDate(null)
                        setCustomEndDate(null)
                        setCurrentPage(1)
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Input
              placeholder="Cari presensi..."
              className="w-[220px]"
              value={presensiSearchQuery}
              onChange={(event) => setPresensiSearchQuery(event.target.value)}
            />
            {!forcedClass && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline">
                      <Filter className="mr-2 size-4" />
                      Filter
                    </Button>
                  }
                />
                <DropdownMenuContent className="w-64">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jenis Sholat</p>
                  {prayerTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={`presensi-sholat-${type}`}
                      checked={selectedSholatFilters.includes(type as any)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedSholatFilters((prev) =>
                          checked ? [...prev, type as any] : prev.filter((item) => item !== type)
                        )
                      }
                    >
                      {type}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Konsentrasi Keahlian</p>
                  {majorOptions.map((major) => (
                    <DropdownMenuCheckboxItem
                      key={`presensi-jurusan-${major}`}
                      checked={selectedPresensiJurusanFilters.includes(major)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) => {
                        setSelectedPresensiJurusanFilters(checked ? [major] : [])
                        setSelectedPresensiKelasFilters([]) // Clear class selection when major changes
                      }}
                    >
                      {major}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Kelas</p>
                  {selectedPresensiJurusanFilters.length === 0 ? (
                    <p className="px-6 py-2 text-xs italic text-muted-foreground">Pilih konsentrasi keahlian terlebih dahulu</p>
                  ) : (
                    presensiClassOptions.map((kelas) => (
                      <DropdownMenuCheckboxItem
                        key={`presensi-kelas-${kelas}`}
                        checked={selectedPresensiKelasFilters.includes(kelas)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          setSelectedPresensiKelasFilters(checked ? [kelas] : [])
                        }
                      >
                        {kelas}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">No</th>
                  <th className="px-4 py-3 text-left font-medium">NIS</th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium">Sholat</th>
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <Spinner className="mx-auto" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada riwayat presensi ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.nis}-${record.jenisSholat}-${record.tanggal}`} className="border-t">
                      <td className="px-4 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3 font-medium">{record.nis}</td>
                      <td className="px-4 py-3">{record.nama}</td>
                      <td className="px-4 py-3">{record.kelas}</td>
                      <td className="px-4 py-3">{record.jenisSholat}</td>
                      <td className="px-4 py-3">{record.tanggal || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClassName(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        {record.status === "Izin" || record.status === "Sakit" ? (
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetail(record)}>
                            <Eye className="mr-2 size-4" />
                            Detail
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between print:hidden">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredRecords.length} dari {totalItems} data
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Sebelumnya
              </Button>
              <span className="text-sm font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailPresensi)} onOpenChange={(open) => { if (!open) { setDetailPresensi(null); setIzinDetail(null) } }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader className="print:hidden">
            <DialogTitle>Detail Izin Presensi</DialogTitle>
            <DialogDescription>Informasi pengajuan izin siswa.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
          {isLoadingIzin ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : izinDetail ? (
            <div className="space-y-3 text-sm">
              <PrintHeader
                title="Detail Izin Presensi"
                studentName={detailPresensi?.nama}
                nis={detailPresensi?.nis}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Jenis</p>
                  <p className="font-medium capitalize">{izinDetail.jenis_izin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Periode</p>
                  <p className="font-medium">
                    {izinDetail.tanggal_awal?.slice(0, 10)} — {izinDetail.tanggal_akhir?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Keterangan</p>
                <p className="whitespace-pre-wrap break-words">{izinDetail.keterangan}</p>
              </div>
              {izinDetail.status === "ditolak" && izinDetail.catatan_verifikasi && (
                <div>
                  <p className="text-xs text-muted-foreground">Alasan Penolakan</p>
                  <p className="whitespace-pre-wrap break-words text-red-600">{izinDetail.catatan_verifikasi}</p>
                </div>
              )}
              {izinDetail.bukti_foto_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Bukti</p>
                  <BuktiFotoPreview
                    url={izinDetail.bukti_foto_url}
                    onDownload={handleDownloadBukti}
                    isDownloading={isDownloading}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="size-3" />
                  Tidak ada bukti terlampir
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data pengajuan izin tidak ditemukan.</p>
          )}
          </div>
          <DialogFooter className="print:hidden">
            <Button
              variant="outline"
              onClick={print}
              disabled={!izinDetail}
            >
              <Printer className="mr-2 size-4" />
              Cetak Detail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
