import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AuthShell } from "@/pages/auth/AuthShell"
import { saveAuthSession, syncTokenToBackend } from "@/lib/auth-session"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const response: any = await window.electronAPI.login({
        body: {
          identifier,
          password,
        },
      })

      console.log("Login success response:", response)

      // Based on verified API response: { data: { role: "admin", ... }, message: "..." }
      const role = response.data?.role || "siswa"
      if (response.data && typeof response.data === "object") {
        saveAuthSession(response.data)
      }
      await syncTokenToBackend()

      // F-07: Check if account needs verification
      if (response.data?.is_verified === false) {
        navigate("/verify-account")
        return
      }
      
      if (role === "admin") {
        navigate("/dashboard")
      } else if (role === "guru" || role === "wali_kelas") {
        navigate("/guru-dashboard")
      } else {
        navigate("/siswa-dashboard")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.toString())
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AuthShell>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Masuk</CardTitle>
          <CardDescription>Masuk menggunakan pengenal dan kata sandi Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 text-sm font-medium text-red-600 bg-red-50/50 rounded-xl border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Pengenal</Label>
              <Input
                id="identifier"
                name="identifier"
                placeholder="Email atau NIS"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2 text-current" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 py-4 bg-muted/20 border-t">
          <div className="flex w-full justify-between gap-2 text-xs">
            <Link to="/register" className="text-primary hover:underline font-medium">
              Buat akun baru
            </Link>
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">
              Lupa kata sandi?
            </Link>
          </div>
        </CardFooter>
      </Card>
    </AuthShell>
  )
}
