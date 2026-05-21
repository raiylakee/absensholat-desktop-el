import { ReactNode, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { syncTokenToBackend, fetchCurrentProfile } from "@/lib/auth-session"
import { Spinner } from "@/components/ui/spinner"

interface AutoLoginGuardProps {
  children: ReactNode
}

/**
 * Route guard that wraps the login page.
 * If auto-login is enabled and a token exists, attempts to authenticate
 * automatically and navigates to the role-based dashboard on success.
 * On failure or timeout, clears stored tokens and renders children (login page).
 * If auto-login is disabled, renders children immediately.
 */
export function AutoLoginGuard({ children }: AutoLoginGuardProps) {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState<boolean>(() => {
    const autoLogin = localStorage.getItem("auto_login")
    const token = localStorage.getItem("auth_token")
    return autoLogin === "true" && !!token
  })

  useEffect(() => {
    const autoLogin = localStorage.getItem("auto_login")
    const token = localStorage.getItem("auth_token")

    if (autoLogin !== "true" || !token) {
      setIsChecking(false)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const attemptAutoLogin = async () => {
      try {
        const result = await Promise.race([
          (async () => {
            await syncTokenToBackend()
            return await fetchCurrentProfile()
          })(),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("timeout")), 15_000)
          }),
        ])

        if (cancelled) return

        // Navigate based on role
        const role = result.role
        if (role === "admin") {
          navigate("/dashboard", { replace: true })
        } else if (role === "guru" || role === "wali_kelas") {
          navigate("/guru-dashboard", { replace: true })
        } else {
          navigate("/siswa-dashboard", { replace: true })
        }
      } catch (err) {
        console.error("[AutoLogin] Failed:", err)
        if (cancelled) return

        // Only clear tokens on auth errors, not on timeouts/network errors
        const isAuthError = err instanceof Error && (
          err.message.includes("401") ||
          err.message.includes("403") ||
          err.message.includes("unauthorized") ||
          err.message.includes("forbidden")
        )
        if (isAuthError) {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("auth_role")
          localStorage.removeItem("auth_refresh_token")
        }
        setIsChecking(false)
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
      }
    }

    attemptAutoLogin()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [navigate])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Memuat sesi...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
