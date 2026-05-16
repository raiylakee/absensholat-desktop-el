import { useEffect, useState } from "react"
import { BookMarked, CircuitBoard, QrCode, Users, Wrench, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { extractData } from "@/lib/api-utils"
import { QRCodeSVG } from "qrcode.react"
import { notify } from "@/lib/notify"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

import logoRpl from "@/assets/logo-rpl 3.png"
import logoTei from "@/assets/logo-tei 2.png"
import logoDkv from "@/assets/logo-dkv 2.png"
import logoTkj from "@/assets/logo-tkj 2.png"
import logoAn from "@/assets/logo-an 2.png"
import logoBc from "@/assets/logo-bc 2.png"
import logoMt from "@/assets/logo-mt 2.png"
import logoTav from "@/assets/logo-tav 2.png"

interface JenisSholat {
  id_jenis: number
  nama_jenis: string
  butuh_giliran: boolean
}

interface WaktuSholat {
  id_waktu: number
  id_jenis: number
  waktu_mulai: string
  waktu_selesai: string
  berlaku_mulai: string
  berlaku_sampai: string | null
  jenis_sholat: JenisSholat
}

interface Jurusan {
  id_jurusan: number
  nama_jurusan: string
  hari_dhuha: string
}

interface JadwalSholat {
  id_jadwal: number
  id_waktu: number
  hari: string
  jurusans: Jurusan[]
  waktu_sholat: WaktuSholat
}

interface ClosestPrayerData {
  current: JadwalSholat | null
  next: JadwalSholat | null
}

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

interface ChartData {
  daily_trend: DailyTrendPoint[]
  prayer_breakdown: PrayerBreakdownPoint[]
}

interface StudentStatusCount {
  class_status: string
  count: number
}

const logoMap: Record<string, string> = {
  RPL: logoRpl, TKJ: logoTkj, DKV: logoDkv, TEI: logoTei,
  AN: logoAn, BC: logoBc, MT: logoMt, TAV: logoTav,
}

const gradientMap: Record<string, string> = {
  RPL: "from-orange-400 to-orange-600 shadow-orange-200/50",
  TKJ: "from-yellow-500 to-yellow-600 shadow-yellow-200/50",
  DKV: "from-sky-400 to-sky-600 shadow-sky-200/50",
  TEI: "from-emerald-400 to-emerald-600 shadow-emerald-200/50",
  AN: "from-rose-400 to-rose-600 shadow-rose-200/50",
  BC: "from-red-400 to-red-600 shadow-red-200/50",
  MT: "from-green-400 to-green-600 shadow-green-200/50",
  TAV: "from-lime-500 to-lime-600 shadow-lime-200/50",
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

export function DashboardOverviewSection() {
  const [selectedSchedule, setSelectedSchedule] = useState<{ title: string; time: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [closestData, setClosestData] = useState<ClosestPrayerData | null>(null)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [studentStatusData, setStudentStatusData] = useState<StudentStatusCount[]>([])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, closestRes, chartRes, filtersRes]: [any, any, any, any] = await Promise.all([
        window.electronAPI.getAttendanceStatistics(),
        window.electronAPI.getClosestPrayerSchedule(),
        window.electronAPI.getChartData(),
        window.electronAPI.getStudentFilters(),
      ])
      setStatsData(extractData(statsRes))
      setClosestData(extractData<ClosestPrayerData>(closestRes))

      const cd = extractData<ChartData>(chartRes)
      if (cd) setChartData(cd)

      const filters = extractData<any>(filtersRes)
      if (filters?.by_status) setStudentStatusData(filters.by_status)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [])

  const generateQRToken = async () => {
    setIsGeneratingQR(true)
    try {
      const response = await window.electronAPI.generateQrToken() as { data?: { token?: string }; token?: string }
      const token = response?.data?.token ?? response?.token ?? (typeof response === "string" ? response : null)
      if (!token) throw new Error("Token tidak ditemukan dalam respons")
      setQrToken(token as string)
    } catch (error) {
      notify(`Gagal membuat QR Code: ${error instanceof Error ? error.message : String(error)}`, "error")
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const handleOpenQRDialog = (schedule: { title: string; time: string }) => {
    setSelectedSchedule(schedule)
    setQrToken(null)
    generateQRToken()
  }

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const stats = [
    { title: "Total Siswa", value: statsData?.total_siswa?.toString() || "0", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", sub: "Semua siswa terdaftar" },
    { title: "Total Hadir Hari Ini", value: statsData?.total_kehadiran_hari_ini?.toString() || "0", icon: BookMarked, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", sub: todayLabel },
    { title: "Total Izin / Sakit", value: ((statsData?.total_izin_hari_ini || 0) + (statsData?.total_sakit_hari_ini || 0)).toString(), icon: Wrench, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", sub: todayLabel },
    { title: "Total Alpha", value: statsData?.total_alpha_hari_ini?.toString() || "0", icon: CircuitBoard, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", sub: todayLabel },
  ]

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

  const currentPrayer = closestData?.current
  const nextPrayer = closestData?.next
  const activePrayer = currentPrayer || nextPrayer
  const isCurrentlyActive = !!currentPrayer

  const prayerTitle = activePrayer?.waktu_sholat?.jenis_sholat?.nama_jenis || "Tidak ada jadwal"
  const prayerTime = activePrayer
    ? `${activePrayer.waktu_sholat.waktu_mulai} - ${activePrayer.waktu_sholat.waktu_selesai} WIB`
    : "-"
  const prayerLabel = isCurrentlyActive ? "Sedang berlangsung" : "Berikutnya"

  const isDhuhaActive = currentPrayer?.waktu_sholat?.jenis_sholat?.nama_jenis?.toLowerCase() === "dhuha"
  const dhuhaMajors = isDhuhaActive ? (currentPrayer?.jurusans || []) : []

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">Memuat data dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-primary">Overview Hari Ini</h2>
        <Button variant="ghost" size="sm" onClick={fetchDashboardData} className="gap-2">
          <RefreshCw className="size-4" />
          Segarkan
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.title} className="group overflow-hidden border shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-5">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${item.bg} ${item.color} transition-colors group-hover:bg-primary/10`}>
                  <item.icon className="size-6 transition-transform group-hover:scale-110" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                  <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                  <p className="text-xs text-muted-foreground/70 truncate">{item.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's donut + Student status donut */}
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
                        {todayDonutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
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
                        {studentDonutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
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

      {/* 7-day trend line chart */}
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

      {/* Prayer breakdown bar chart */}
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

      {/* Prayer schedule + Dhuha schedule */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Jadwal Sholat Terdekat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 p-4 transition-all hover:bg-primary/10">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-primary">{prayerTitle}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCurrentlyActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                    {prayerLabel}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{prayerTime}</p>
              </div>
              {activePrayer && (
                <Button variant="default" size="icon-sm" onClick={() => handleOpenQRDialog({ title: prayerTitle, time: prayerTime })} className="rounded-full shadow-lg shadow-primary/20">
                  <QrCode className="size-4" />
                  <span className="sr-only">Show QR Code</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Jadwal Dhuha per Jurusan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {isDhuhaActive && dhuhaMajors.length > 0 ? (
              dhuhaMajors.map((jurusan) => (
                <div key={jurusan.id_jurusan} className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-all hover:scale-[1.02] bg-gradient-to-br ${gradientMap[jurusan.nama_jurusan] || "from-slate-400 to-slate-600"} text-white border-none`}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/20 p-2 backdrop-blur-md">
                    <img src={logoMap[jurusan.nama_jurusan] || logoRpl} alt={jurusan.nama_jurusan} className="size-full object-contain" />
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden">
                    <h3 className="font-bold text-base tracking-tight leading-none">{jurusan.nama_jurusan}</h3>
                    <p className="text-[10px] font-medium opacity-90 mt-1 truncate leading-none">
                      Dhuha • {currentPrayer!.waktu_sholat.waktu_mulai} - {currentPrayer!.waktu_sholat.waktu_selesai} WIB
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex items-center gap-3 rounded-xl border p-3 shadow-sm bg-gradient-to-br from-slate-500 to-slate-700 text-white border-none">
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-base tracking-tight leading-none">
                    {isDhuhaActive ? "Tidak ada jurusan" : "Bukan waktu Dhuha"}
                  </h3>
                  <p className="text-[10px] font-medium opacity-90 mt-1 leading-none">
                    {isDhuhaActive ? "Tidak ada jurusan terjadwal" : "Jadwal Dhuha per jurusan akan muncul saat waktu Dhuha berlangsung"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedSchedule)} onOpenChange={(open) => {
        if (!open) { setSelectedSchedule(null); setQrToken(null) }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSchedule ? `QR Presensi ${selectedSchedule.title}` : "QR Presensi"}</DialogTitle>
            <DialogDescription>
              {selectedSchedule ? `${selectedSchedule.time} • Scan QR ini untuk melakukan presensi.` : "Scan QR ini untuk melakukan presensi."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            {isGeneratingQR ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-muted-foreground">Membuat QR Code...</p>
              </div>
            ) : qrToken ? (
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/20 rounded-[2rem] blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                <div className="relative flex items-center justify-center size-56 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
                  <QRCodeSVG value={qrToken} size={224} />
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/20 rounded-[2rem] blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                <div className="relative flex items-center justify-center size-56 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
                  <QrCode className="size-full text-slate-900" strokeWidth={1.5} />
                </div>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground max-w-[200px]">
              QR ini akan diperbarui secara otomatis setiap sesi sholat dimulai.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
