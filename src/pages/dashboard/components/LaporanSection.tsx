import { useMemo, useState, useEffect, useRef } from "react"
import { Download, Filter, FileText, FileSpreadsheet, File, Calendar as CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { PRAYER_TYPE_OPTIONS, MAJOR_OPTIONS } from "@/pages/dashboard/constants"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData, normalizeAttendance } from "@/lib/api-utils"

interface LaporanSectionProps {
  forcedClass?: string
}

export function LaporanSection({ forcedClass }: LaporanSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSholatFilters, setSelectedSholatFilters] = useState<string[]>([])
  const [selectedKelasFilters, setSelectedKelasFilters] = useState<string[]>([])
  const [selectedJurusanFilters, setSelectedJurusanFilters] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Real API state
  const [records, setRecords] = useState<ReturnType<typeof normalizeAttendance>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const isMounted = useRef(true)

  // Download Dialog State
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false)
  const [downloadRange, setDownloadRange] = useState("monthly")
  const [downloadFormat, setDownloadFormat] = useState("excel")
  const [downloadClasses, setDownloadClasses] = useState<string[]>(["All"])
  const [isDownloading, setIsDownloading] = useState(false)

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 50,
        search: searchQuery || undefined,
        kelas: forcedClass || selectedKelasFilters[0] || undefined,
        jurusan: selectedJurusanFilters[0] || undefined,
      }
      if (startDate) {
        params.start_date = format(startDate, "yyyy-MM-dd")
      }
      if (endDate) {
        params.end_date = format(endDate, "yyyy-MM-dd")
      }

      const response: any = await window.electronAPI.getAttendanceHistory(params)

      // Response: { data: { absensi: [...], pagination: {...}, statistik: {...} } }
      const wrapper: any = extractData(response)
      const absensi = wrapper?.absensi ?? wrapper ?? []
      const mapped = Array.isArray(absensi) ? absensi.map(normalizeAttendance) : []
      if (!isMounted.current) return
      setRecords(mapped)
      const pagination = wrapper?.pagination ?? {}
      setTotalPages(pagination.total_pages ?? 1)
      setTotalItems(pagination.total_items ?? mapped.length)
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil riwayat absensi:", error)
      notify("Gagal mengambil riwayat absensi", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchHistory()
    return () => { isMounted.current = false }
  }, [currentPage])

  // Debounced fetch when filters/search/dates change
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        fetchHistory()
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, selectedKelasFilters, selectedJurusanFilters, selectedSholatFilters, startDate, endDate])

  const classOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.kelas))),
    [records]
  )

  // Client-side filter for sholat type and forcedClass (not sent to API)
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchSholat =
        selectedSholatFilters.length === 0 || selectedSholatFilters.includes(record.jenisSholat)
      const matchForcedClass = !forcedClass || record.kelas === forcedClass
      return matchSholat && matchForcedClass
    })
  }, [records, selectedSholatFilters, forcedClass])

  const getStatusBadgeClassName = (status: string) => {
    if (status === "Hadir") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
    if (status === "Izin") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
    if (status === "Sakit") return "bg-blue-100 text-blue-700 hover:bg-blue-100"
    return "bg-red-100 text-red-700 hover:bg-red-100" // For Alpha if any
  }

  const handleDownloadReport = async () => {
    // PDF is not supported by the backend
    if (downloadFormat === "pdf") {
      notify("Format PDF belum didukung", "error")
      return
    }

    // Map format to endpoint and file extension
    const formatConfig: Record<string, { endpoint: string; extension: string; filterName: string }> = {
      excel: {
        endpoint: "/api/v2/reports/attendances/excel",
        extension: "xlsx",
        filterName: "Excel Files",
      },
      csv: {
        endpoint: "/api/v2/reports/attendances/csv",
        extension: "csv",
        filterName: "CSV Files",
      },
    }

    const config = formatConfig[downloadFormat]
    if (!config) {
      notify("Format tidak dikenali", "error")
      return
    }

    // Prompt user for save path
    const savePath = await window.electronAPI.showSaveDialog({
      filters: [
        {
          name: config.filterName,
          extensions: [config.extension],
        },
      ],
      defaultPath: `laporan-absensi.${config.extension}`,
    })

    if (!savePath) {
      // User cancelled the dialog
      return
    }

    setIsDownloading(true)
    try {
      // Determine date params from downloadRange or active date filters
      let exportStartDate: string | undefined
      let exportEndDate: string | undefined

      if (downloadRange === "custom") {
        exportStartDate = startDate ? format(startDate, "yyyy-MM-dd") : undefined
        exportEndDate = endDate ? format(endDate, "yyyy-MM-dd") : undefined
      } else if (downloadRange === "weekly") {
        const now = new Date()
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        exportStartDate = format(weekAgo, "yyyy-MM-dd")
        exportEndDate = format(now, "yyyy-MM-dd")
      } else if (downloadRange === "monthly") {
        const now = new Date()
        const monthAgo = new Date(now)
        monthAgo.setMonth(now.getMonth() - 1)
        exportStartDate = format(monthAgo, "yyyy-MM-dd")
        exportEndDate = format(now, "yyyy-MM-dd")
      } else if (downloadRange === "yearly") {
        const now = new Date()
        const yearAgo = new Date(now)
        yearAgo.setFullYear(now.getFullYear() - 1)
        exportStartDate = format(yearAgo, "yyyy-MM-dd")
        exportEndDate = format(now, "yyyy-MM-dd")
      }

      // Determine kelas/jurusan from download class selection
      const exportKelas =
        downloadClasses.includes("All") || downloadClasses.length === 0
          ? undefined
          : downloadClasses[0]

      const bytes: number[] = await window.electronAPI.exportReport({
        endpoint: config.endpoint,
        startDate: exportStartDate,
        endDate: exportEndDate,
        kelas: exportKelas,
        jurusan: undefined,
      })

      // Write bytes to the chosen path
      await window.electronAPI.writeFile({ filePath: savePath, data: Array.from(new Uint8Array(bytes as any)), encoding: 'base64' })

      notify("Laporan berhasil diunduh ke " + savePath, "success")
      setIsDownloadDialogOpen(false)
    } catch (error) {
      console.error("Gagal mengunduh laporan:", error)
      notify("Gagal mengunduh laporan: " + error, "error")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <CardTitle>Data Absensi</CardTitle>
            <p className="text-xs text-muted-foreground">Unduh laporan berdasarkan filter di bawah</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" onClick={() => setIsDownloadDialogOpen(true)}>
              <Download className="mr-2 size-4" />
              Unduh Laporan
            </Button>

            <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-muted/20">
              <div className="flex items-center gap-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"ghost"}
                        className={cn(
                          "h-8 w-[130px] justify-start text-left font-normal px-2 text-xs hover:bg-background/50",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {startDate ? format(startDate, "PP") : <span>Pilih tanggal</span>}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-[1px] h-4 bg-border" />
              <div className="flex items-center gap-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"ghost"}
                        className={cn(
                          "h-8 w-[130px] justify-start text-left font-normal px-2 text-xs hover:bg-background/50",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {endDate ? format(endDate, "PP") : <span>Pilih tanggal</span>}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Input
              placeholder="Cari data..."
              className="w-[200px]"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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
                <DropdownMenuContent className="w-56" align="end">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jurusan</p>
                  {MAJOR_OPTIONS.map((major) => (
                    <DropdownMenuCheckboxItem
                      key={`laporan-jurusan-${major}`}
                      checked={selectedJurusanFilters.includes(major)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedJurusanFilters((prev) =>
                          checked ? [...prev, major] : prev.filter((item) => item !== major)
                        )
                      }
                    >
                      {major}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Jenis Sholat</p>
                  {PRAYER_TYPE_OPTIONS.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={`laporan-sholat-${type}`}
                      checked={selectedSholatFilters.includes(type)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedSholatFilters((prev) =>
                          checked ? [...prev, type] : prev.filter((item) => item !== type)
                        )
                      }
                    >
                      {type}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Kelas</p>
                  <div className="max-h-[200px] overflow-y-auto">
                    {classOptions.map((kelas) => (
                      <DropdownMenuCheckboxItem
                        key={`laporan-kelas-${kelas}`}
                        checked={selectedKelasFilters.includes(kelas)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          setSelectedKelasFilters((prev) =>
                            checked ? [...prev, kelas] : prev.filter((item) => item !== kelas)
                          )
                        }
                      >
                        {kelas}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
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
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium">NIS</th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium">Sholat</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner size="sm" />
                        <span>Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.nis}-${index}`} className="border-t">
                      <td className="px-4 py-3">{(currentPage - 1) * 50 + index + 1}</td>
                      <td className="px-4 py-3">{record.tanggal}</td>
                      <td className="px-4 py-3 font-medium">{record.nis}</td>
                      <td className="px-4 py-3">{record.nama}</td>
                      <td className="px-4 py-3">{record.kelas}</td>
                      <td className="px-4 py-3">{record.jenisSholat}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClassName(record.status)}>{record.status}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Data tidak ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
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

      {/* Download Report Dialog */}
      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Download Laporan Absensi</DialogTitle>
            <DialogDescription>
              Konfigurasi pengaturan laporan sebelum mengunduh.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Time Range Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Rentang Waktu</Label>
              <RadioGroup 
                value={downloadRange} 
                onValueChange={setDownloadRange}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="weekly" id="range-weekly" />
                  <Label htmlFor="range-weekly" className="flex-1 cursor-pointer">Mingguan</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="monthly" id="range-monthly" />
                  <Label htmlFor="range-monthly" className="flex-1 cursor-pointer">Bulanan</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="yearly" id="range-yearly" />
                  <Label htmlFor="range-yearly" className="flex-1 cursor-pointer">Tahunan</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="custom" id="range-custom" />
                  <Label htmlFor="range-custom" className="flex-1 cursor-pointer">Kustom (Filter Aktif)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Class Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Pilih Kelas</Label>
              <div className="rounded-lg border p-3 space-y-3 max-h-[150px] overflow-y-auto">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="class-all" 
                    checked={downloadClasses.includes("All")}
                    onCheckedChange={(checked) => {
                      if (checked) setDownloadClasses(["All"])
                      else setDownloadClasses([])
                    }}
                  />
                  <Label htmlFor="class-all" className="font-medium">Semua Kelas</Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {classOptions.map(kelas => (
                    <div key={`download-class-${kelas}`} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`dl-class-${kelas}`}
                        checked={downloadClasses.includes(kelas)}
                        onCheckedChange={(checked) => {
                          setDownloadClasses(prev => {
                            const withoutAll = prev.filter(c => c !== "All")
                            if (checked) return [...withoutAll, kelas]
                            return withoutAll.filter(c => c !== kelas)
                          })
                        }}
                      />
                      <Label htmlFor={`dl-class-${kelas}`} className="text-xs">{kelas}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Format Dokumen</Label>
              <Select value={downloadFormat} onValueChange={(val) => val !== null && setDownloadFormat(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">
                    <div className="flex items-center">
                      <FileSpreadsheet className="mr-2 size-4 text-emerald-600" />
                      Microsoft Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center">
                      <FileText className="mr-2 size-4 text-red-500" />
                      Adobe PDF (.pdf)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center">
                      <File className="mr-2 size-4 text-blue-500" />
                      Comma Separated Values (.csv)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDownloadDialogOpen(false)} disabled={isDownloading}>
              Batal
            </Button>
            <Button onClick={handleDownloadReport} disabled={isDownloading} className="bg-primary hover:bg-primary/90">
              {isDownloading ? <Spinner size="sm" className="mr-2" /> : <Download className="mr-2 size-4" />}
              {isDownloading ? "Mengunduh..." : "Unduh Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
