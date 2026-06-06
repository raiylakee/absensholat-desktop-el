import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, Download, FileText, AlertCircle, ClipboardList, History, Printer } from "lucide-react"
import { PrayerNotification } from "./PrayerNotification"
import { extractData, normalizeAttendance } from "@/lib/api-utils"
import type { UserProfileData } from "@/lib/auth-session"
import { useDownloadAction } from "@/hooks/use-download-action"
import { usePrintAction } from "@/hooks/use-print-action"
import { arrayToXlsxBase64 } from "@/lib/export-xlsx"
import { PrintHeader } from "@/components/print-header"

interface SiswaOverviewProps {
  setActiveItem: (item: string) => void
  user?: UserProfileData
}

function getIndonesianDay(): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  return days[new Date().getDay()]
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
  const { print } = usePrintAction()

  const handleDownload = useCallback(() => {
    download({
      filenameOptions: {
        dataType: 'riwayat-absensi-saya',
        format: 'xlsx',
      },
      fetchData: async () => {
        const normalized = historyData.map(normalizeAttendance)
        const headers = ['Tanggal', 'Jenis Sholat', 'Waktu', 'Status']
        const rows = normalized.map((r) => [
          r.tanggal,
          r.jenisSholat ?? '',
          r.waktu ?? '',
          r.status ?? '',
        ])
        const data = arrayToXlsxBase64(headers, rows)
        return { data, encoding: 'base64' as const }
      },
      dialogFilters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    })
  }, [download, historyData])

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
    Promise.all([
      window.electronAPI.getPrayerSchedules(),
      window.electronAPI.getPrayerTimes(),
      window.electronAPI.getPrayerTypes(),
    ])
      .then(([schedulesRes, timesRes, typesRes]) => {
        if (!isMounted.current) return
        const rawSchedules = extractData<any[]>(schedulesRes) ?? []
        const prayerTimes: any[] = extractData<any[]>(timesRes) ?? []
        const prayerTypes: any[] = extractData<any[]>(typesRes) ?? []
        const typeMap = new Map(prayerTypes.map((t: any) => [t.id_jenis, t]))
        const timeMap = new Map(prayerTimes.map((t: any) => [t.id_waktu, { ...t, jenis_sholat: typeMap.get(t.id_jenis) }]))
        const enriched = rawSchedules.map((s: any) => {
          const time = timeMap.get(s.id_waktu)
          return {
            ...s,
            jenis_sholat: time?.jenis_sholat?.nama_jenis ?? null,
            waktu_mulai: time?.waktu_mulai?.substring(0, 5) ?? null,
            waktu_selesai: time?.waktu_selesai?.substring(0, 5) ?? null,
          }
        })
        setSchedules(enriched)
      })
      .catch(() => {
        // Schedule endpoints may be admin-only — silently ignore
      })
  }

  useEffect(() => {
    isMounted.current = true
    fetchData()
    return () => { isMounted.current = false }
  }, [])

  const todayName = getIndonesianDay()
  const todaySchedules = schedules.filter((s: any) => s.hari === todayName)

  // Deduplicate by jenis_sholat so each prayer type appears once
  const uniqueTodaySchedules = todaySchedules.reduce((acc: any[], s: any) => {
    const key = s.jenis_sholat || s.id_jenis
    if (key && !acc.find((x: any) => (x.jenis_sholat || x.id_jenis) === key)) {
      acc.push(s)
    }
    return acc
  }, [])

  const totalKehadiran = statsData?.total_hadir ?? statsData?.total_absensi ?? 0
  const totalAlpha = statsData?.total_alpha ?? 0
  const totalIzinSakit = (statsData?.total_izin ?? 0) + (statsData?.total_sakit ?? 0)

  const stats = [
    {
      label: "Total Absensi",
      value: String(totalKehadiran),
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Alpha",
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

  const normalizedHistory = historyData.map(normalizeAttendance)

  const formatTanggal = (tanggal: string) => {
    try {
      return new Date(tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
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
            Jadwal Sholat Hari Ini
          </CardTitle>
          <CardDescription>Waktu pelaksanaan sholat di sekolah</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uniqueTodaySchedules.length > 0 ? (
            uniqueTodaySchedules.map((s: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <span className="font-medium">{s.jenis_sholat}</span>
                <span className="text-sm font-semibold">
                  {s.waktu_mulai} - {s.waktu_selesai} WIB
                </span>
              </div>
            ))
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
                Riwayat Absensi
              </CardTitle>
              <CardDescription>Catatan kehadiran Anda selama 30 hari terakhir</CardDescription>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={print}
                      disabled={isLoading || normalizedHistory.length === 0}
                    >
                      <Printer className="size-4 mr-2" />
                      Cetak Riwayat
                    </Button>
                  </TooltipTrigger>
                  {(isLoading || normalizedHistory.length === 0) && (
                    <TooltipContent>
                      {isLoading
                        ? "Data sedang dimuat"
                        : "Tidak ada data untuk dicetak"}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PrintHeader
            title="Riwayat Absensi Saya"
            studentName={user?.name}
            nis={user?.nis}
          />
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
              <p className="text-sm text-muted-foreground">Tidak ada riwayat absensi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
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
