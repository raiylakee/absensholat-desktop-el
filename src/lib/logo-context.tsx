import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import defaultLogoSrc from "@/assets/logo.png"

interface LogoContextType {
  logoSrc: string
  logoType: "default" | "custom"
  saveCustomLogo: (filePath?: string) => Promise<string | null>
  resetLogo: () => Promise<void>
}

const LogoContext = createContext<LogoContextType | undefined>(undefined)

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logoSrc, setLogoSrc] = useState(defaultLogoSrc)
  const [logoType, setLogoType] = useState<"default" | "custom">("default")

  useEffect(() => {
    window.electronAPI.getLogoData().then(({ data, type }) => {
      if (data) {
        setLogoSrc(`data:image/png;base64,${data}`)
        setLogoType(type)
      }
    }).catch(() => {
      // Fallback to bundled default
    })
  }, [])

  const saveCustomLogo = useCallback(async (filePath?: string) => {
    const result = await window.electronAPI.saveCustomLogo({ filePath })
    if (result.success && result.data) {
      const src = `data:image/png;base64,${result.data}`
      setLogoSrc(src)
      setLogoType("custom")
      return src
    }
    return null
  }, [])

  const resetLogo = useCallback(async () => {
    const { data } = await window.electronAPI.resetLogo()
    if (data) {
      setLogoSrc(`data:image/png;base64,${data}`)
    } else {
      setLogoSrc(defaultLogoSrc)
    }
    setLogoType("default")
  }, [])

  return (
    <LogoContext.Provider value={{ logoSrc, logoType, saveCustomLogo, resetLogo }}>
      {children}
    </LogoContext.Provider>
  )
}

export function useLogo() {
  const context = useContext(LogoContext)
  if (!context) {
    throw new Error("useLogo must be used within LogoProvider")
  }
  return context
}
