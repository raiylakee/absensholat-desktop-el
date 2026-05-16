import { useEffect, useState } from "react"

export function useProcessingProgress(isProcessing: boolean) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isProcessing) {
      setProgress(0)
      return
    }

    setProgress(12)
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + 8))
    }, 120)

    return () => window.clearInterval(timer)
  }, [isProcessing])

  return progress
}
