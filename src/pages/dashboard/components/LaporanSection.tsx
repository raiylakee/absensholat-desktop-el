import { useMemo, useState, useEffect, useRef } from "react"
import { Download, Filter, FileText, FileSpreadsheet, File, Calendar as CalendarIcon, Printer } from "lucide-react"
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
import { usePrintAction } from "@/hooks/use-print-action"
import { PrintHeader } from "@/components/print-header"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDownloadAction } from "@/hooks/use-download-action"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface DailyTrendPoint {
  date: string
  hadir: number
  izin: number
  sakit: number
  alpha: number
}

interface PrayerBreakdownPoint {
  prayer: string
  hadir: number
  izin: number
  sakit: number
  alpha: number
}

interface ChartDataState {
  daily_trend: DailyTrendPoint[]
  prayer_breakdown: PrayerBreakdownPoint[]
}

interface StudentStatusCount {
  class_status: string
  count: number
}

const attendanceChartConfig = {
  hadir: { label: "Hadir", color: "#10b981" },
  izin: { label: "Izin", color: "#f59e0b" },
  sakit: { label: "Sakit", color: "#3b82f6" },
  alpha: { label: "Alpha", color: "#ef4444" },
} satisfies ChartConfig

const STATUS_COLORS: Record<string, string> = {
  aktif: "#3b82f6",
  naik_kelas: "#10b981",
  tinggal_kelas: "#f59e0b",
  keluar: "#ef4444",
  alumni: "#8b5cf6",
}

const STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  naik_kelas: "Naik Kelas",
  tinggal_kelas: "Tinggal Kelas",
  keluar: "Keluar",
  alumni: "Alumni",
}

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
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)

  const { isDownloading, download } = useDownloadAction()

  // Print action
  const { print } = usePrintAction()

  // Validation: custom range requires both dates
  const isCustomRangeInvalid =
    downloadRange === "custom" && (!customStartDate || !customEndDate)

  // Chart state
  const [chartData, setChartData] = useState<ChartDataState | null>(null)
  const [studentStatusData, setStudentStatusData] = useState<StudentStatusCount[]>([])
  const [statsData, setStatsData] = useState<any>(null)
  const [dynamicMajorOptions, setDynamicMajorOptions] = useState<string[]>(MAJOR_OPTIONS)
  const [dynamicPrayerTypes, setDynamicPrayerTypes] = useState<string[]>(PRAYER_TYPE_OPTIONS)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const [chartRes, filtersRes, statsRes, majorsRes, typesRes]: [any, any, any, any, any] = await Promise.all([
          window.electronAPI.getChartData(),
          window.electronAPI.getStudentFilters(),
          window.electronAPI.getAttendanceStatistics(),
          window.electronAPI.getMajors(),
          window.electronAPI.getPrayerTypes(),
        ])
        const cd = extractData<ChartDataState>(chartRes)
        if (cd) setChartData(cd)
        const filters = extractData<any>(filtersRes)
        if (filters?.by_status) setStudentStatusData(filters.by_status)
        setStatsData(extractData(statsRes))
        const majors: any[] = extractData(majorsRes) ?? []
        if (majors.length > 0) setDynamicMajorOptions(majors.map((m: any) => m.nama_jurusan))
        const types: any[] = extractData(typesRes) ?? []
        if (types.length > 0) setDynamicPrayerTypes(types.map((t: any) => t.nama_jenis))
      } catch (error) {
        console.error("Failed to fetch chart data:", error)
      }
    }
    fetchChartData()
  }, [])

  const todayDonutData = statsData ? [
    { name: "Hadir", value: statsData.total_kehadiran_hari_ini || 0, color: "#10b981" },
    { name: "Izin", value: statsData.total_izin_hari_ini || 0, color: "#f59e0b" },
    { name: "Sakit", value: statsData.total_sakit_hari_ini || 0, color: "#3b82f6" },
    { name: "Alpha", value: statsData.total_alpha_hari_ini || 0, color: "#ef4444" },
  ].filter(d => d.value > 0) : []

  const totalToday = todayDonutData.reduce((s, d) => s + d.value, 0)
  const hadirPct = totalToday > 0 ? Math.round(((statsData?.total_kehadiran_hari_ini || 0) / totalToday) * 100) : 0

  const studentDonutData = studentStatusData
    .filter(s => s.count > 0)
    .map(s => ({
      name: STATUS_LABELS[s.class_status] ?? s.class_status,
      value: s.count,
      color: STATUS_COLORS[s.class_status] ?? "#94a3b8",
      key: s.class_status,
    }))

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
    // Map format to endpoint and file extension
    const formatConfig: Record<string, { endpoint: string; extension: string; filterName: string; exportFormat: 'xlsx' | 'csv' | 'pdf' }> = {
      excel: {
        endpoint: "/api/v2/reports/attendance/excel",
        extension: "xlsx",
        filterName: "Excel Files",
        exportFormat: "xlsx",
      },
      csv: {
        endpoint: "/api/v2/reports/attendances/csv",
        extension: "csv",
        filterName: "CSV Files",
        exportFormat: "csv",
      },
      pdf: {
        endpoint: "/api/v2/reports/attendance/pdf",
        extension: "pdf",
        filterName: "PDF Files",
        exportFormat: "pdf",
      },
    }

    const config = formatConfig[downloadFormat]
    if (!config) {
      notify("Format tidak dikenali", "error")
      return
    }

    // Determine active filter for filename (jurusan takes priority, then kelas, then forcedClass)
    const activeFilter =
      selectedJurusanFilters[0] ||
      forcedClass ||
      selectedKelasFilters[0] ||
      undefined

    await download({
      filenameOptions: {
        dataType: "laporan-absensi",
        format: config.exportFormat,
        filter: activeFilter,
      },
      dialogFilters: [{ name: config.filterName, extensions: [config.extension] }],
      fetchData: async () => {
        // Determine date params from downloadRange
        let exportStartDate: string | undefined
        let exportEndDate: string | undefined

        if (downloadRange === "custom") {
          exportStartDate = customStartDate ? format(customStartDate, "yyyy-MM-dd") : undefined
          exportEndDate = customEndDate ? format(customEndDate, "yyyy-MM-dd") : undefined
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

        // Pass active jurusan/kelas filters (Property 8)
        const exportJurusan =
          selectedJurusanFilters.length > 0 ? selectedJurusanFilters[0] : undefined
        const exportKelas =
          forcedClass ||
          (selectedKelasFilters.length > 0 ? selectedKelasFilters[0] : undefined) ||
          (downloadClasses.includes("All") || downloadClasses.length === 0
            ? undefined
            : downloadClasses[0])

        const result: any = await window.electronAPI.exportReport({
          endpoint: config.endpoint,
          startDate: exportStartDate,
          endDate: exportEndDate,
          kelas: exportKelas,
          jurusan: exportJurusan,
        })

        return { data: result.data, encoding: "base64" as const }
      },
    })

    setIsDownloadDialogOpen(false)
  }

  // Build active filters for PrintHeader
  const activeFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (forcedClass) {
      filters["Kelas"] = forcedClass
    } else {
      if (selectedKelasFilters.length > 0) filters["Kelas"] = selectedKelasFilters.join(", ")
      if (selectedJurusanFilters.length > 0) filters["Jurusan"] = selectedJurusanFilters.join(", ")
    }
    if (selectedSholatFilters.length > 0) filters["Sholat"] = selectedSholatFilters.join(", ")
    if (startDate) filters["Dari"] = format(startDate, "dd/MM/yyyy")
    if (endDate) filters["Sampai"] = format(endDate, "dd/MM/yyyy")
    return filters
  }, [forcedClass, selectedKelasFilters, selectedJurusanFilters, selectedSholatFilters, startDate, endDate])

  const isPrintDisabled = records.length === 0 || isLoading

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kehadiran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {todayDonutData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Belum ada data kehadiran hari ini</div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={todayDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={2}>
                        {todayDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{hadirPct}%</span>
                    <span className="text-[10px] text-muted-foreground">Hadir</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {todayDonutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="size-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto pl-4">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            {studentDonutData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Belum ada data siswa</div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={studentDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={2}>
                        {studentDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{studentDonutData.reduce((s, d) => s + d.value, 0)}</span>
                    <span className="text-[10px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {studentDonutData.map((d) => (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="size-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto pl-4">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tren Kehadiran 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {!chartData?.daily_trend?.length ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Belum ada data tren</div>
          ) : (
            <ChartContainer config={attendanceChartConfig} className="h-56 w-full">
              <LineChart data={chartData.daily_trend} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="hadir" stroke="var(--color-hadir)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="izin" stroke="var(--color-izin)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sakit" stroke="var(--color-sakit)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="alpha" stroke="var(--color-alpha)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kehadiran per Jenis Sholat (7 Hari)</CardTitle>
        </CardHeader>
        <CardContent>
          {!chartData?.prayer_breakdown?.length ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Belum ada data per jenis sholat</div>
          ) : (
            <ChartContainer config={attendanceChartConfig} className="h-56 w-full">
              <BarChart data={chartData.prayer_breakdown} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="prayer" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="hadir" fill="var(--color-hadir)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="izin" fill="var(--color-izin)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sakit" fill="var(--color-sakit)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="alpha" fill="var(--color-alpha)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

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

            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger render={<span tabIndex={isPrintDisabled ? 0 : undefined} />}>
                  <Button
                    variant="outline"
                    onClick={print}
                    disabled={isPrintDisabled}
                  >
                    <Printer className="mr-2 size-4" />
                    Cetak
                  </Button>
                </TooltipTrigger>
                {isPrintDisabled && (
                  <TooltipContent>
                    {isLoading
                      ? "Data sedang dimuat, harap tunggu"
                      : "Tidak ada data untuk dicetak"}
                  </TooltipContent>
                )}
              </UITooltip>
            </TooltipProvider>

            <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-muted/20">
              <div className="flex items-center gap-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Dari</Label>
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
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai</Label>
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
                  {dynamicMajorOptions.map((major) => (
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
                  {dynamicPrayerTypes.map((type) => (
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
          <PrintHeader title="Laporan Absensi" filters={activeFilters} />
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
            <DialogTitle>Unduh Laporan Absensi</DialogTitle>
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
                  <Label htmlFor="range-custom" className="flex-1 cursor-pointer">Kustom</Label>
                </div>
              </RadioGroup>

              {/* Custom date range pickers */}
              {downloadRange === "custom" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tanggal Mulai</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground",
                              isCustomRangeInvalid && !customStartDate && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "PP") : <span>Pilih tanggal mulai</span>}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customStartDate ?? undefined}
                          onSelect={(d) => setCustomStartDate(d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {isCustomRangeInvalid && !customStartDate && (
                      <p className="text-xs text-destructive">Tanggal mulai wajib diisi</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tanggal Akhir</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground",
                              isCustomRangeInvalid && !customEndDate && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "PP") : <span>Pilih tanggal akhir</span>}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate ?? undefined}
                          onSelect={(d) => setCustomEndDate(d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {isCustomRangeInvalid && !customEndDate && (
                      <p className="text-xs text-destructive">Tanggal akhir wajib diisi</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Class Selection */}
            {!forcedClass && (
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
            )}

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Format Dokumen</Label>
              <Select value={downloadFormat} onValueChange={(val) => val !== null && setDownloadFormat(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih format">
                    {downloadFormat === "excel" ? "Microsoft Excel (.xlsx)" : downloadFormat === "pdf" ? "PDF Document (.pdf)" : "Pilih format"}
                  </SelectValue>
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
            <Button onClick={handleDownloadReport} disabled={isDownloading || isCustomRangeInvalid} className="bg-primary hover:bg-primary/90">
              {isDownloading ? <Spinner size="sm" className="mr-2" /> : <Download className="mr-2 size-4" />}
              {isDownloading ? "Mengunduh..." : "Unduh Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
