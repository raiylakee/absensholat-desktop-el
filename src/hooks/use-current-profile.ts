import { useEffect, useState } from "react"
import { fetchCurrentProfile, getSavedToken, syncTokenToBackend, type UserProfileData } from "@/lib/auth-session"

type UseCurrentProfileResult = {
  profile: UserProfileData | null
  isLoading: boolean
}

export function useCurrentProfile(): UseCurrentProfileResult {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      const token = getSavedToken()
      if (!token) {
        if (active) {
          setProfile(null)
          setIsLoading(false)
        }
        return
      }

      try {
        await syncTokenToBackend()
        const currentProfile = await fetchCurrentProfile()
        if (active) {
          setProfile(currentProfile)
        }
      } catch (error) {
        console.error("Failed to load current profile:", error)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  return { profile, isLoading }
}
