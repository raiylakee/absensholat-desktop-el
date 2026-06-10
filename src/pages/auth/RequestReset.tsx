import { FormEvent, useState } from "react"
import { Link } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { AuthStatusDialog } from "@/pages/auth/AuthStatusDialog"
import { useNavigate } from "react-router-dom"
import { handleApiError } from "@/lib/api-utils"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function RequestReset() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [nis, setNis] = useState("")
  const [errors, setErrors] = useState<{ email?: string; nis?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [dialog, setDialog] = useState({ open: false, title: "", description: "", variant: "default" as "default" | "destructive" })

  // Pre-fill from previous attempts if available
  useEffect(() => {
    const savedNis = localStorage.getItem("forgot_password_nis")
    const savedEmail = localStorage.getItem("forgot_password_email")
    if (savedNis) setNis(savedNis)
    if (savedEmail) setEmail(savedEmail)
  }, [])


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { email?: string; nis?: string } = {}
    if (!email.trim()) nextErrors.email = "Surel wajib diisi."
    if (!nis.trim()) nextErrors.nis = "NIS wajib diisi."
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Silakan masukkan alamat surel yang valid."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setDialog({
        open: true,
        title: "Kesalahan validasi",
        description: "Email dan NIS diperlukan untuk meminta OTP.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response: any = await window.electronAPI.forgotPassword({
        body: { email, nis }
      })

      // Save NIS/Email for next steps to improve UX
      localStorage.setItem("forgot_password_nis", nis)
      localStorage.setItem("forgot_password_email", email)

      setDialog({
        open: true,
        title: "OTP Dikirim",
        description: response.message || "Kode OTP telah dikirim ke email Anda.",
        variant: "default",
      })

      // Navigate to verify-otp after a short delay
      setTimeout(() => {
        navigate("/verify-otp")
      }, 2000)
    } catch (err: any) {
      setDialog({
        open: true,
        title: "Gagal meminta OTP",
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
          <CardTitle className="text-xl">Atur Ulang Kata Sandi</CardTitle>
          <CardDescription>masukkan surel dan nis anda untuk mendapatkan kode otp.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Surel</Label>
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
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2 text-current" />
                  Memproses...
                </>
              ) : (
                "Minta OTP"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 py-4 bg-muted/20 border-t">
          <div className="flex w-full justify-between gap-2 text-xs">
            <Link to="/verify-otp" className="text-primary hover:underline font-medium">
              Sudah punya OTP?
            </Link>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Kembali ke masuk
            </Link>
          </div>
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
