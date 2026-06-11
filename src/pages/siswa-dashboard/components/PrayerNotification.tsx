import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, QrCode, ArrowRight } from "lucide-react"
import { extractData } from "@/lib/api-utils"
import { DAY_NAMES } from "@/lib/day-names"

interface PrayerNotificationProps {
  onAction: () => void
}

const getIndonesianDay = () => {
  return DAY_NAMES[new Date().getDay()]
}

export function PrayerNotification({ onAction }: PrayerNotificationProps) {
  const [activePrayer, setActivePrayer] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.getPrayerSchedulesToday()
      .then((res) => {
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

        // Check if any prayer is active now using Jakarta time
        const jakartaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
        const currentMinutes = jakartaNow.getHours() * 60 + jakartaNow.getMinutes()

        const active = enriched.find((s: any) => {
          if (!s.waktu_mulai || !s.waktu_selesai) return false
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
              Waktunya Salat {activePrayer}
            </h3>
            <p className="text-sm font-medium text-white/80">
              silakan lakukan presensi sekarang untuk mencatat kehadiran anda.
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
