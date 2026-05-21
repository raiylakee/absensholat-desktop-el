import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { AuthStatusDialog } from "@/pages/auth/AuthStatusDialog"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [nis, setNis] = useState("")
  const [otp, setOtp] = useState("")
  const [errors, setErrors] = useState<{ new_password?: string; nis?: string; otp?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [dialog, setDialog] = useState({ open: false, title: "", description: "", variant: "default" as "default" | "destructive" })

  // Pre-fill NIS and OTP from step 1 & 2
  useEffect(() => {
    const savedNis = localStorage.getItem("forgot_password_nis")
    const savedOtp = localStorage.getItem("forgot_password_otp")
    if (savedNis) setNis(savedNis)
    if (savedOtp) setOtp(savedOtp)
  }, [])


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { new_password?: string; nis?: string; otp?: string } = {}
    if (!newPassword.trim()) nextErrors.new_password = "Kata sandi baru wajib diisi."
    if (!nis.trim()) nextErrors.nis = "NIS wajib diisi."
    if (!otp.trim()) nextErrors.otp = "OTP wajib diisi."
    if (otp.trim() && otp.length !== 6) nextErrors.otp = "OTP harus 6 digit."
    if (newPassword.trim() && newPassword.length < 6) nextErrors.new_password = "Kata sandi minimal 6 karakter."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setDialog({
        open: true,
        title: "Kesalahan validasi",
        description: "Silakan lengkapi semua kolom dengan nilai yang valid.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response: any = await window.electronAPI.resetPassword({
        body: { nis, otp, new_password: newPassword }
      })
      
      setDialog({
        open: true,
        title: "Kata Sandi Direset",
        description: response.message || "Kata sandi Anda telah berhasil diperbarui.",
        variant: "default",
      })
      
      // Clear saved data after success
      localStorage.removeItem("forgot_password_nis")
      localStorage.setItem("forgot_password_email", "") // or remove
      localStorage.removeItem("forgot_password_otp")
      
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err: any) {
      setDialog({
        open: true,
        title: "Gagal reset password",
        description: err.toString(),
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
          <CardTitle className="text-xl">Atur Ulang Kata Sandi</CardTitle>
          <CardDescription>Tetapkan kata sandi baru Anda menggunakan NIS dan OTP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new_password">Kata Sandi Baru</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={Boolean(errors.new_password)}
                className="bg-muted/30"
              />
              {errors.new_password && <p className="text-xs text-destructive font-medium ml-1">{errors.new_password}</p>}
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
              <Label htmlFor="otp">Kode OTP</Label>
              <Input
                id="otp"
                name="otp"
                placeholder="Masukkan kode OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                aria-invalid={Boolean(errors.otp)}
                className="bg-muted/30"
              />
              {errors.otp && <p className="text-xs text-destructive font-medium ml-1">{errors.otp}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2 text-current" />
                  Memperbarui...
                </>
              ) : (
                "Atur Ulang Kata Sandi"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center py-4 bg-muted/20 border-t">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Kembali ke Masuk
          </Link>
        </CardFooter>
      </Card>
      <AuthStatusDialog
        open={dialog.open}
        title={dialog.title}
        description={dialog.description}
        variant={dialog.variant}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
      />
    </AuthShell>
  )
}
