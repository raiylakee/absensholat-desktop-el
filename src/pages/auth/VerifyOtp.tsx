import { FormEvent, useState } from "react"
import { Link } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { AuthStatusDialog } from "@/pages/auth/AuthStatusDialog"
import { useNavigate } from "react-router-dom"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function VerifyOtp() {
  const navigate = useNavigate()
  const [nis, setNis] = useState("")
  const [otp, setOtp] = useState("")
  const [errors, setErrors] = useState<{ nis?: string; otp?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [dialog, setDialog] = useState({ open: false, title: "", description: "", variant: "default" as "default" | "destructive" })

  // Pre-fill NIS if available from step 1
  useEffect(() => {
    const savedNis = localStorage.getItem("forgot_password_nis")
    if (savedNis) setNis(savedNis)
  }, [])


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { nis?: string; otp?: string } = {}
    if (!nis.trim()) nextErrors.nis = "NIS wajib diisi."
    if (!otp.trim()) nextErrors.otp = "OTP wajib diisi."
    if (otp.trim() && otp.length !== 6) nextErrors.otp = "OTP harus 6 digit."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setDialog({
        open: true,
        title: "Kesalahan validasi",
        description: "Silakan masukkan NIS dan kode OTP 6 digit yang valid.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response: any = await window.electronAPI.verifyOtp({
        body: { nis, otp }
      })

      // Save for final step
      localStorage.setItem("forgot_password_nis", nis)
      localStorage.setItem("forgot_password_otp", otp)

      setDialog({
        open: true,
        title: "OTP Berhasil",
        description: response.message || "OTP valid. Silakan lanjutkan untuk mengatur ulang kata sandi.",
        variant: "default",
      })

      setTimeout(() => {
        navigate("/reset-password")
      }, 2000)
    } catch (err: any) {
      setDialog({
        open: true,
        title: "Gagal verifikasi OTP",
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
          <CardTitle className="text-xl">Verifikasi OTP</CardTitle>
          <CardDescription>Masukkan NIS dan kode OTP Anda untuk melanjutkan atur ulang kata sandi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
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
              <InputOTP id="otp" name="otp" maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center py-2" aria-invalid={Boolean(errors.otp)}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="rounded-md border-2" />
                  <InputOTPSlot index={1} className="rounded-md border-2" />
                  <InputOTPSlot index={2} className="rounded-md border-2" />
                  <InputOTPSlot index={3} className="rounded-md border-2" />
                  <InputOTPSlot index={4} className="rounded-md border-2" />
                  <InputOTPSlot index={5} className="rounded-md border-2" />
                </InputOTPGroup>
              </InputOTP>
              {errors.otp && <p className="text-xs text-destructive font-medium text-center">{errors.otp}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2 text-current" />
                  Memverifikasi...
                </>
              ) : (
                "Verifikasi OTP"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 py-4 bg-muted/20 border-t">
          <div className="flex w-full justify-between gap-2 text-xs">
            <Link to="/reset-password" className="text-primary hover:underline font-medium">
              Lanjutkan atur ulang
            </Link>
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">
              Minta kode baru
            </Link>
          </div>
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors text-center w-full">
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
