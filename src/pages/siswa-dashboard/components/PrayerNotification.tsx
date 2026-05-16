import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, QrCode, ArrowRight } from "lucide-react"
import { extractData } from "@/lib/api-utils"

interface PrayerNotificationProps {
  onAction: () => void
}

const getIndonesianDay = () => {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  return days[new Date().getDay()]
}

export function PrayerNotification({ onAction }: PrayerNotificationProps) {
  const [activePrayer, setActivePrayer] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      window.electronAPI.getPrayerSchedules(),
      window.electronAPI.getPrayerTimes(),
      window.electronAPI.getPrayerTypes(),
    ])
      .then(([schedulesRes, timesRes, typesRes]) => {
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

        // Check if any prayer is active now
        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        const todayDay = getIndonesianDay()

        const active = enriched.find((s: any) => {
          if (s.hari !== todayDay || !s.waktu_mulai || !s.waktu_selesai) return false
          const [startH, startM] = s.waktu_mulai.split(":").map(Number)
          const [endH, endM] = s.waktu_selesai.split(":").map(Number)
          return currentMinutes >= startH * 60 + startM && currentMinutes <= endH * 60 + endM
        })

        setActivePrayer(active?.jenis_sholat ?? null)
      })
      .catch(() => {})
  }, [])

  if (!activePrayer) return null

  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/90 to-primary shadow-lg ring-1 ring-white/20">
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 size-32 rounded-full bg-primary-foreground/10 blur-2xl" />
      
      <CardContent className="relative flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur-md">
            <Bell className="size-6 animate-ring" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-white">
              Waktunya Sholat {activePrayer}
            </h3>
            <p className="text-sm font-medium text-white/80">
              Silahkan lakukan presensi sekarang untuk mencatat kehadiran Anda.
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onAction}
          size="lg"
          className="group w-full shrink-0 gap-2 bg-white font-semibold text-primary hover:bg-white/90 sm:w-auto"
        >
          <QrCode className="size-4" />
          Pindai QR Sekarang
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
