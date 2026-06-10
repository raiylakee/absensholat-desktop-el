
export const AUTH_TOKEN_KEY = "auth_token"
export const AUTH_ROLE_KEY = "auth_role"
export const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token"

type RawApiResponse = {
  data?: Record<string, unknown>
  message?: string
}

export type UserProfileData = {
  name: string
  role: string
  email: string
  nip?: string
  gender?: string
  className?: string
  nis?: string
  major?: string
  username?: string
  avatarFallback: string
}

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

const gradeCodeToLabel = (code: string): string | null => {
  if (code === "1") return "X"
  if (code === "2") return "XI"
  if (code === "3") return "XII"
  return null
}

const normalizeClassName = (rawClass: unknown, major: string | undefined): string | undefined => {
  if (typeof rawClass !== "string") return undefined
  const trimmed = rawClass.trim()
  if (!trimmed) return undefined

  // Already formatted (contains letters) — return as-is
  if (/[a-zA-Z]/.test(trimmed)) return trimmed

  // Numeric class code: first digit = grade (1=X, 2=XI, 3=XII), rest = class part
  if (/^\d{2,4}$/.test(trimmed)) {
    const grade = gradeCodeToLabel(trimmed[0])
    const number = String(Number(trimmed.slice(1)))
    if (grade && number !== "0") {
      return major ? `${grade} ${major} ${number}` : `${grade} ${number}`
    }
  }

  return trimmed
}

export const getSavedToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY)

export const saveAuthSession = (data: Record<string, unknown>) => {
  const token = firstString(data.token)
  const role = firstString(data.role)
  const refreshToken = firstString(data.refresh_token)

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
  if (role) {
    localStorage.setItem(AUTH_ROLE_KEY, role)
  }
  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken)
  }
}

export const clearSavedSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_ROLE_KEY)
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
}

export const syncTokenToBackend = async () => {
  const token = getSavedToken()
  if (!token) {
    await window.electronAPI.clearAuthToken()
    return
  }
  await window.electronAPI.setAuthToken({ token })
}

export const fetchCurrentProfile = async (): Promise<UserProfileData> => {
  const response = (await window.electronAPI.getCurrentProfile()) as RawApiResponse
  const data = asRecord(response.data) ?? {}

  // Some APIs nest student data inside a "siswa" key
  const siswa = asRecord(data.siswa) ?? {}

  const role = firstString(data.role, localStorage.getItem(AUTH_ROLE_KEY), "siswa") ?? "siswa"
  const name =
    firstString(data.nama, data.nama_siswa, siswa.nama_siswa, siswa.nama, data.name, data.username, data.email, "Pengguna") ?? "Pengguna"
  const email = firstString(data.email, siswa.email, "") ?? ""
  const kelas = asRecord(data.kelas) ?? asRecord(siswa.kelas)
  const major = firstString(data.jurusan, data.major, siswa.jurusan, siswa.nama_jurusan)
  const normalizedClassName = normalizeClassName(
    firstString(data.class_name, data.kelas, siswa.kelas, kelas?.nama_kelas),
    major
  )

  // For wali_kelas, try to resolve their assigned class
  let resolvedClassName = normalizedClassName
  if ((role === "wali_kelas" || role === "guru") && !resolvedClassName && data.id_staff) {
    try {
      const mgmtRes = (await window.electronAPI.getManagementClasses()) as any
      const classes = mgmtRes?.data ?? []
      if (Array.isArray(classes)) {
        const match = classes.find((c: any) => c.id_staff_wali === data.id_staff)
        if (match?.label) resolvedClassName = match.label
      }
    } catch {
      // Admin-only endpoint may fail for wali_kelas - that's OK
    }
  }

  return {
    name,
    role,
    email,
    nip: firstString(data.nip),
    gender: firstString(data.jk, data.jenis_kelamin, data.gender, data.staff_jk, siswa.jk, siswa.jenis_kelamin),
    className: resolvedClassName,
    nis: firstString(data.nis, siswa.nis),
    major,
    username: firstString(data.username),
    avatarFallback: initialsFromName(name),
  }
}

export const logoutSession = async () => {
  try {
    await window.electronAPI.logout()
  } finally {
    clearSavedSession()
    localStorage.setItem("auto_login", "false")
    await window.electronAPI.clearAuthToken()
  }
}
