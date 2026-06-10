import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Upload, RotateCcw } from "lucide-react"
import { useLogo } from "@/lib/logo-context"
import { notify } from "@/lib/notify"

export function SettingsSection() {
  const [autoLogin, setAutoLogin] = useState(() => {
    return localStorage.getItem("auto_login") === "true"
  })
  const [showAutoLoginConfirm, setShowAutoLoginConfirm] = useState(false)
  const [theme, setTheme] = useState<"Light" | "Dark" | "System">(() => {
    const saved = localStorage.getItem("theme") as "Light" | "Dark" | "System"
    return saved || "System"
  })
  const [logoLoading, setLogoLoading] = useState(false)
  const { logoSrc, logoType, saveCustomLogo, resetLogo } = useLogo()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "System") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme.toLowerCase())
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const handleAutoLoginChange = (checked: boolean) => {
    if (checked) {
      setShowAutoLoginConfirm(true)
    } else {
      localStorage.setItem("auto_login", "false")
      setAutoLogin(false)
    }
  }

  const confirmAutoLogin = () => {
    localStorage.setItem("auto_login", "true")
    setAutoLogin(true)
    setShowAutoLoginConfirm(false)
  }

  const handleUploadLogo = async () => {
    setLogoLoading(true)
    try {
      await saveCustomLogo()
      notify.success("Logo berhasil diperbarui")
    } catch {
      notify.error("Gagal mengunggah logo")
    } finally {
      setLogoLoading(false)
    }
  }

  const handleResetLogo = async () => {
    setLogoLoading(true)
    try {
      await resetLogo()
      notify.success("Logo dikembalikan ke default")
    } catch {
      notify.error("Gagal mengembalikan logo")
    } finally {
      setLogoLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex-1">
      <Card className="w-full border">
        <CardHeader>
          <CardTitle>Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 border-b pb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Login Otomatis</span>
              <Switch checked={autoLogin} onCheckedChange={handleAutoLoginChange} />
            </div>
            <p className="text-sm text-muted-foreground">masuk otomatis ke dashboard saat aplikasi dibuka.</p>
          </div>

          <div className="space-y-3 border-b pb-4">
            <span className="font-medium">Logo Aplikasi</span>
            <div className="flex items-center gap-4">
              <div className="flex aspect-square size-16 items-center justify-center rounded-xl overflow-hidden border bg-muted shrink-0">
                <img src={logoSrc} alt="Logo" className="size-10 object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleUploadLogo} disabled={logoLoading}>
                    <Upload className="mr-1.5 size-3.5" />
                    Unggah Logo
                  </Button>
                  {logoType === "custom" && (
                    <Button variant="ghost" size="sm" onClick={handleResetLogo} disabled={logoLoading}>
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Kembalikan Default
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">format PNG, JPG, atau SVG. hanya tersimpan di perangkat ini.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-medium">Pengaturan Tema</span>
            <div className="flex flex-wrap gap-2">
              <Button variant={theme === "Light" ? "default" : "outline"} onClick={() => setTheme("Light")}>
                Terang
              </Button>
              <Button variant={theme === "Dark" ? "default" : "outline"} onClick={() => setTheme("Dark")}>
                Gelap
              </Button>
              <Button variant={theme === "System" ? "default" : "outline"} onClick={() => setTheme("System")}>
                Sistem
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAutoLoginConfirm} onOpenChange={setShowAutoLoginConfirm}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="size-5" />
              <DialogTitle>Peringatan Keamanan</DialogTitle>
            </div>
            <DialogDescription>
              Mengaktifkan Login Otomatis memungkinkan siapa saja yang memiliki akses ke perangkat ini untuk masuk ke dashboard tanpa kata sandi. Hanya disarankan untuk perangkat pribadi yang aman.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAutoLoginConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmAutoLogin}>
              Tetap Aktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
