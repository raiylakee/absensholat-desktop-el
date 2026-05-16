import { createContext, useContext, useState, ReactNode } from "react"

interface LogoAnimationContextType {
  showSplashLogo: boolean
  setShowSplashLogo: (show: boolean) => void
  splashComplete: boolean
  setSplashComplete: (complete: boolean) => void
}

const LogoAnimationContext = createContext<LogoAnimationContextType | undefined>(undefined)

export function LogoAnimationProvider({ children }: { children: ReactNode }) {
  const [showSplashLogo, setShowSplashLogo] = useState(true)
  const [splashComplete, setSplashComplete] = useState(false)

  return (
    <LogoAnimationContext.Provider
      value={{
        showSplashLogo,
        setShowSplashLogo,
        splashComplete,
        setSplashComplete,
      }}
    >
      {children}
    </LogoAnimationContext.Provider>
  )
}

export function useLogoAnimation() {
  const context = useContext(LogoAnimationContext)
  if (!context) {
    throw new Error("useLogoAnimation must be used within LogoAnimationProvider")
  }
  return context
}
