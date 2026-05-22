import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ShieldCheck } from "lucide-react"

export default function VerifyAccount() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (newPassword && newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok")
      return
    }

    setIsProcessing(true)
    try {
      const body: any = {}
      if (newPassword) {
        body.new_password = newPassword
        body.confirm_password = confirmPassword
      }
      await window.electronAPI.verifyAccount({ body })

      // After verification, get role from localStorage and redirect
      const role = localStorage.getItem("auth_role") || "siswa"
      if (role === "admin") navigate("/dashboard")
      else if (role === "guru" || role === "wali_kelas") navigate("/guru-dashboard")
      else navigate("/siswa-dashboard")
    } catch (err: any) {
      setError(err.toString())
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AuthShell>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Verifikasi Akun</CardTitle>
          <CardDescription>
            Ini adalah login pertama Anda. Silakan konfirmasi akun dan atur password baru (opsional).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru (Opsional)</Label>
              <PasswordInput
                id="new-password"
                placeholder="Kosongkan jika tidak ingin mengubah"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {newPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? <><Spinner size="sm" className="mr-2" />Memverifikasi...</> : "Verifikasi & Lanjutkan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
