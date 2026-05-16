import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { normalizeNotification } from "@/lib/api-utils"

// --- Relative Timestamp Formatting (same as notification-panel.tsx) ---

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMinutes < 1) return "Baru saja"
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffHours < 48) return "Kemarin"
  return `${diffDays} hari lalu`
}

interface NormalizedNotification {
  id: any
  title: string
  message: string
  created_at: string | undefined
}

export function NotificationsSection() {
  const [notifications, setNotifications] = useState<NormalizedNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    async function fetchNotifications() {
      try {
        const result = await window.electronAPI.getNotifications() as any
        if (!isMounted.current) return
        const raw: any[] = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : []
        setNotifications(raw.map(normalizeNotification))
      } catch {
        if (isMounted.current) setNotifications([])
      } finally {
        if (isMounted.current) setIsLoading(false)
      }
    }

    fetchNotifications()
    return () => { isMounted.current = false }
  }, [])

  return (
    <div className="space-y-4">
      <Card className="border">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tidak ada notifikasi
            </p>
          ) : (
            notifications.map((notif, index) => {
              const displayTitle = notif.title
                ? notif.title
                : notif.message.slice(0, 80)
              const timestamp = notif.created_at
                ? new Date(notif.created_at).getTime()
                : Date.now()

              return (
                <div
                  key={notif.id ?? index}
                  className="rounded-lg border bg-background p-3 text-sm space-y-1"
                >
                  <p className="font-medium leading-snug">{displayTitle}</p>
                  {notif.message && notif.title && (
                    <p className="text-muted-foreground text-xs leading-snug">
                      {notif.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(timestamp)}
                  </p>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
