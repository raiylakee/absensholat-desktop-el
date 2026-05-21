import { useEffect, useState } from "react"
import { BookMarked, CircuitBoard, QrCode, Users, Wrench, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { extractData } from "@/lib/api-utils"

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

const logoMap: Record<string, string> = {
  RPL: logoRpl, TKJ: logoTkj, DKV: logoDkv, TEI: logoTei,
  ANM: logoAn, BC: logoBc, TMT: logoMt, TAV: logoTav,
}

const gradientMap: Record<string, string> = {
  RPL: "from-orange-400 to-orange-600 shadow-orange-200/50",
  TKJ: "from-yellow-500 to-yellow-600 shadow-yellow-200/50",
  DKV: "from-sky-400 to-sky-600 shadow-sky-200/50",
  TEI: "from-emerald-400 to-emerald-600 shadow-emerald-200/50",
  ANM: "from-rose-400 to-rose-600 shadow-rose-200/50",
  BC: "from-red-400 to-red-600 shadow-red-200/50",
  TMT: "from-green-400 to-green-600 shadow-green-200/50",
  TAV: "from-lime-500 to-lime-600 shadow-lime-200/50",
}

export function DashboardOverviewSection({ onNavigate, showQrButton = true }: { onNavigate?: (page: string) => void; showQrButton?: boolean }) {
  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [closestData, setClosestData] = useState<ClosestPrayerData | null>(null)

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, closestRes]: [any, any] = await Promise.all([
        window.electronAPI.getAttendanceStatistics(),
        window.electronAPI.getClosestPrayerSchedule(),
      ])
      setStatsData(extractData(statsRes))
      setClosestData(extractData<ClosestPrayerData>(closestRes))
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
              {activePrayer && onNavigate && showQrButton && (
                <Button variant="default" size="icon-sm" onClick={() => onNavigate("QR Code")} className="rounded-full shadow-lg shadow-primary/20">
                  <QrCode className="size-4" />
                  <span className="sr-only">Tampilkan QR Code</span>
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
    </div>
  )
}
