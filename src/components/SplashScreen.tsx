import { useEffect, useState } from "react"
import { useEffect, useState } from "react"
import { useLogo } from "@/lib/logo-context"
import { useLogoAnimation } from "@/lib/logo-animation-context"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const { setShowSplashLogo, setSplashComplete } = useLogoAnimation()
  const { logoSrc } = useLogo()

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 20
      })
    }, 150)

    // Complete loading after 3 seconds
    const completeTimer = setTimeout(() => {
      setProgress(100)
      setIsComplete(true)
      
      // Start logo animation to titlebar
      setTimeout(() => {
        setShowSplashLogo(false)
        setSplashComplete(true)
      }, 300)

      // Wait for fade out animation then complete
      setTimeout(() => {
        onComplete()
      }, 600)
    }, 3000)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(completeTimer)
    }
  }, [onComplete, setShowSplashLogo, setSplashComplete])

  return (
    <div className={`splash-screen ${isComplete ? "splash-exit" : ""}`}>
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes logoFlyToTitlebar {
          from {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(calc(-50vw + 40px), calc(-50vh + 20px)) scale(0.2);
          }
        }

        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #2563eb;
          overflow: hidden;
        }

        .splash-exit {
          animation: fadeOut 0.6s ease-out forwards;
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 48px;
        }

        .splash-logo {
          animation: fadeInScale 0.6s ease-out forwards;
        }

        .splash-logo.flying {
          animation: logoFlyToTitlebar 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
        }

        .splash-logo img {
          width: 96px;
          height: 96px;
          object-fit: contain;
        }

        .splash-text {
          text-align: center;
          animation: slideUpFade 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }

        .splash-text.hiding {
          animation: fadeOut 0.4s ease-out forwards !important;
        }

        .splash-text h1 {
          font-size: 36px;
          font-weight: bold;
          color: white;
          margin-bottom: 4px;
          margin: 0;
        }

        .splash-text p {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .splash-progress {
          width: 256px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: slideUpFade 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }

        .splash-progress.hiding {
          animation: fadeOut 0.4s ease-out forwards !important;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: white;
          border-radius: 9999px;
          transition: width 0.3s ease-out;
        }

        .progress-text {
          font-size: 14px;
          font-weight: 500;
          color: white;
        }
      `}</style>

      <div className="splash-content">
        {/* Logo */}
        <div className={`splash-logo ${isComplete ? "flying" : ""}`}>
          <img src={logoSrc} alt="Logo Salat" />
        </div>

        {/* App name and tagline */}
        <div className={`splash-text ${isComplete ? "hiding" : ""}`}>
          <h1>Presensi Salat</h1>
          <p>Sistem Absensi Terpadu</p>
        </div>

        {/* Progress bar */}
        <div className={`splash-progress ${isComplete ? "hiding" : ""}`}>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">{Math.round(progress)}%</div>
        </div>
      </div>
    </div>
  )
}
