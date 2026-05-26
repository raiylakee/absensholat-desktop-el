import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { AuthStatusDialog } from "@/pages/auth/AuthStatusDialog"
import { handleApiError } from "@/lib/api-utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [nis, setNis] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; nis?: string; password?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [dialog, setDialog] = useState({ open: false, title: "", description: "", variant: "default" as "default" | "destructive" })


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { email?: string; nis?: string; password?: string } = {}
    if (!email.trim()) nextErrors.email = "Email wajib diisi."
    if (!nis.trim()) nextErrors.nis = "NIS wajib diisi."
    if (!password.trim()) nextErrors.password = "Kata sandi wajib diisi."
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Silakan masukkan alamat email yang valid."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setDialog({
        open: true,
        title: "Kesalahan validasi",
        description: "Silakan perbaiki kolom formulir pendaftaran yang ditandai.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await window.electronAPI.register({
        body: {
          email,
          nis,
          password,
        }
      })
      
      setDialog({
        open: true,
        title: "Pendaftaran Berhasil",
        description: "Akun Anda telah berhasil dibuat. Silakan masuk.",
        variant: "default",
      })
      
      // Navigate to login after a short delay if needed, 
      // or let user click close on dialog
    } catch (err: any) {
      setDialog({
        open: true,
        title: "Gagal Mendaftar",
        description: handleApiError(err),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AuthShell>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Daftar Akun Baru</CardTitle>
          <CardDescription>Buat akun Anda dengan email, NIS, dan kata sandi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="anda@contoh.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                className="bg-muted/30"
              />
              {errors.email && <p className="text-xs text-destructive font-medium ml-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nis">NIS</Label>
              <Input
                id="nis"
                name="nis"
                placeholder="Contoh: 7771/1116.063"
                value={nis}
                onChange={(event) => setNis(event.target.value)}
                aria-invalid={Boolean(errors.nis)}
                className="bg-muted/30"
              />
              {errors.nis && <p className="text-xs text-destructive font-medium ml-1">{errors.nis}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="bg-muted/30"
              />
              {errors.password && <p className="text-xs text-destructive font-medium ml-1">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2 text-current" />
                  Memproses...
                </>
              ) : (
                "Daftar Sekarang"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center py-4 bg-muted/20 border-t">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Sudah punya akun? Masuk di sini
          </Link>
        </CardFooter>
      </Card>
      <AuthStatusDialog
        open={dialog.open}
        title={dialog.title}
        description={dialog.description}
        variant={dialog.variant}
        onClose={() => {
          setDialog((current) => ({ ...current, open: false }));
          if (dialog.title === "Pendaftaran Berhasil") {
            navigate("/login");
          }
        }}
      />
    </AuthShell>
  )
}
