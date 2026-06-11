import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, Download, FileText, AlertCircle, ClipboardList, History, QrCode } from "lucide-react"
import { PrayerNotification } from "./PrayerNotification"
import { extractData, normalizeAttendance } from "@/lib/api-utils"
import { formatDateID } from "@/lib/date-utils"
import { DAY_NAMES } from "@/lib/day-names"
import type { UserProfileData } from "@/lib/auth-session"
import { useDownloadAction } from "@/hooks/use-download-action"
import { arrayToXlsxBase64 } from "@/lib/export-xlsx"

interface SiswaOverviewProps {
  setActiveItem: (item: string) => void
  user?: UserProfileData
}

function getIndonesianDay(): string {
  return DAY_NAMES[new Date().getDay()]
}

export function SiswaOverview({ setActiveItem, user }: SiswaOverviewProps) {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const [statsData, setStatsData] = useState<any>(null)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const { isDownloading, download } = useDownloadAction()

  const fetchData = () => {
    setIsLoading(true)
    setError(null)

    // Attendance history — critical, show error if this fails
    window.electronAPI.getStudentAttendanceHistory({ nis: "" })
      .then((historyRes) => {
        if (!isMounted.current) return
        const historyWrapper = extractData<any>(historyRes)
        setStatsData(historyWrapper?.statistik ?? null)
        setHistoryData(historyWrapper?.absensi ?? [])
      })
      .catch((err) => {
        if (!isMounted.current) return
        setError(typeof err === "string" ? err : "Gagal memuat riwayat absensi")
      })
      .finally(() => {
        if (isMounted.current) setIsLoading(false)
      })

    // Prayer schedules — best-effort, silently ignore permission errors
    window.electronAPI.getPrayerSchedulesToday()
      .then((res) => {
        if (!isMounted.current) return
        const raw = extractData<any[]>(res) ?? []
        const enriched = raw.map((s: any) => {
          const ws = s.waktu_sholat
          return {
            ...s,
            jenis_sholat: ws?.jenis_sholat?.nama_jenis ?? null,
            waktu_mulai: ws?.waktu_mulai?.substring(0, 5) ?? null,
            waktu_selesai: ws?.waktu_selesai?.substring(0, 5) ?? null,
          }
        })
        setSchedules(enriched)
      })
      .catch(() => {
        // Schedule endpoint may fail — silently ignore
      })
  }

  useEffect(() => {
    isMounted.current = true
    fetchData()
    return () => { isMounted.current = false }
  }, [])

  const uniqueTodaySchedules = schedules.reduce((acc: any[], s: any) => {
    const key = s.jenis_sholat || s.id_jenis
    if (key && !acc.find((x: any) => (x.jenis_sholat || x.id_jenis) === key)) {
      acc.push(s)
    }
    return acc
  }, [])

  // Detect which prayer is currently active (Jakarta time)
  const activePrayerKey = useMemo(() => {
    const jakartaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
    const currentMinutes = jakartaNow.getHours() * 60 + jakartaNow.getMinutes()
    const active = uniqueTodaySchedules.find((s: any) => {
      if (!s.waktu_mulai || !s.waktu_selesai) return false
      const [startH, startM] = s.waktu_mulai.split(":").map(Number)
      const [endH, endM] = s.waktu_selesai.split(":").map(Number)
      return currentMinutes >= startH * 60 + startM && currentMinutes <= endH * 60 + endM
    })
    return (active?.jenis_sholat || active?.id_jenis) ?? null
  }, [uniqueTodaySchedules])

  const totalKehadiran = statsData?.total_hadir ?? statsData?.total_absensi ?? 0
  const totalAlpha = statsData?.total_alpha ?? 0
  const totalIzinSakit = (statsData?.total_izin ?? 0) + (statsData?.total_sakit ?? 0)

  const stats = [
    {
      label: "Total Presensi",
      value: String(totalKehadiran),
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Alpa",
      value: String(totalAlpha),
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      label: "Total Izin/Sakit",
      value: String(totalIzinSakit),
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ]

  const normalizedHistory = useMemo(() => {
    return historyData.map((item) => {
      const normalized = normalizeAttendance(item)
      if (!normalized.waktu && normalized.tanggal && normalized.jenisSholat) {
        const date = new Date(normalized.tanggal)
        const dayName = DAY_NAMES[date.getDay()]
        const match = schedules.find(
          (s: any) => s.jenis_sholat === normalized.jenisSholat && s.hari === dayName
        )
        if (match?.waktu_mulai) {
          normalized.waktu = match.waktu_mulai
        }
      }
      return normalized
    })
  }, [historyData, schedules])

  const handleDownload = useCallback(() => {
    download({
      filenameOptions: {
        dataType: 'riwayat-absensi-saya',
        format: 'xlsx',
      },
      fetchData: async () => {
        const headers = ['Tanggal', 'Jenis Salat', 'Waktu', 'Status']
        const rows = normalizedHistory.map((r) => [
          formatDateID(r.tanggal),
          r.jenisSholat ?? '',
          r.waktu ?? '',
          r.status ?? '',
        ])
        const data = arrayToXlsxBase64(headers, rows)
        return { data, encoding: 'base64' as const }
      },
      dialogFilters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    })
  }, [download, normalizedHistory])

  const formatTanggal = (tanggal: string) => {
    try {
      return formatDateID(tanggal)
    } catch {
      return tanggal
    }
  }

  return (
    <div className="space-y-6">
      <PrayerNotification onAction={() => setActiveItem("Pindai QR")} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name ?? "Siswa"}</h1>
        <p className="text-muted-foreground">Hari ini adalah {today}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading
          ? stats.map((stat) => (
              <Card key={stat.label} className="group overflow-hidden border shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5">
                    <div className={`flex size-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                      <stat.icon className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <Spinner size="sm" className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.label} className="group overflow-hidden border shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5">
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-colors group-hover:bg-primary/10`}
                    >
                      <stat.icon className="size-6 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            Jadwal Salat Hari Ini
          </CardTitle>
          <CardDescription>waktu pelaksanaan sholat di sekolah</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uniqueTodaySchedules.length > 0 ? (
            uniqueTodaySchedules.map((s: any, index: number) => {
              const key = s.jenis_sholat || s.id_jenis
              const isActive = activePrayerKey !== null && activePrayerKey === key
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-muted/30"
                  }`}
                >
                  <span className="font-medium">{s.jenis_sholat}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {s.waktu_mulai} - {s.waktu_selesai} WIB
                    </span>
                    {isActive && (
                      <Button
                        size="sm"
                        onClick={() => setActiveItem("Pindai QR")}
                        className="h-8 gap-1.5 bg-white text-blue-600 hover:bg-blue-50"
                      >
                        <QrCode className="size-3.5" />
                        Pindai
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal hari ini</p>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Riwayat Presensi
              </CardTitle>
              <CardDescription>catatan kehadiran anda selama 30 hari terakhir</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isLoading || isDownloading || normalizedHistory.length === 0}
                    >
                      {isDownloading ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : (
                        <Download className="size-4 mr-2" />
                      )}
                      Unduh Riwayat
                    </Button>
                  </TooltipTrigger>
                  {(isLoading || normalizedHistory.length === 0) && (
                    <TooltipContent>
                      {isLoading
                        ? "Data sedang dimuat"
                        : "Tidak ada data untuk diunduh"}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Coba Lagi
              </Button>
            </div>
          ) : normalizedHistory.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">tidak ada riwayat absensi</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-18rem)] rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-card sticky top-0 z-10">
                  <tr className="text-left font-medium text-muted-foreground">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Sholat</th>
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {normalizedHistory.map((row, index) => (
                    <tr key={index} className="hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium">{formatTanggal(row.tanggal)}</td>
                      <td className="px-6 py-4">{row.jenisSholat}</td>
                      <td className="px-6 py-4">{row.waktu ?? "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge
                          variant="secondary"
                          className={
                            row.status === "Hadir"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : row.status === "Izin" || row.status === "Sakit"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
