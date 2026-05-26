/**
 * API Utility Functions
 * Handles API response normalization and error handling
 */

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
    total_items?: number;
  };
  pagination?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
    total_items?: number;
  };
}

/**
 * Extract data from API response, handling both wrapped and unwrapped responses
 */
export function extractData<T>(response: any): T {
  if (response === null || response === undefined) {
    return [] as unknown as T;
  }
  
  // If response has a data property, use it
  if (response.data !== undefined) {
    return response.data as T;
  }
  
  // Otherwise return the response itself
  return response as T;
}

/**
 * Extract pagination info from API response
 */
export function extractPagination(response: any) {
  const pagination = response?.pagination || response?.meta || {};
  
  return {
    page: pagination.page || 1,
    pageSize: pagination.page_size || pagination.limit || 20,
    total: pagination.total || pagination.total_items || 0,
    totalPages: pagination.total_pages || 1,
  };
}

/**
 * Normalize student data from API response
 */
export function normalizeStudent(item: any) {
  // Handle various API response formats
  
  // Get NIS
  const nis = item.nis || item.NIS || "";
  
  // Get name - try multiple field names
  const nama = (item.nama_siswa || item.nama || item.Nama || "")
    .replace(/%!s\(int=\d+\)/g, "")
    .trim();
  
  // Get jurusan - prefer the name field
  const jurusan = item.nama_jurusan || item.jurusan || item.Jurusan || "-";
  
  // Get kelas - try multiple sources
  let kelas = item.kelas || item.Kelas || item.label || "-";
  
  // If kelas looks malformed (like "D-11"), try to reconstruct it
  if (kelas && kelas.includes("-") && !kelas.includes(" ")) {
    // Try to build from tingkatan and jurusan
    if (item.tingkatan && item.jurusan) {
      kelas = `${item.tingkatan} ${item.jurusan}`.trim();
    }
  }
  
  // Get gender
  const jenisKelamin = item.jk === "P" || item.jk === "Perempuan" 
    ? "Perempuan" as const 
    : "Laki-laki" as const;

  return {
    nis,
    nama,
    jurusan,
    kelas,
    jenisKelamin,
    agama: item.agama || "Islam",
    id_jurusan: item.id_jurusan,
    id_kelas: item.id_kelas,
    id_tahun_masuk: item.id_tahun_masuk,
    class_status: item.class_status || "active",
    status_akademik: item.status_akademik || "AKTIF",
  };
}

/**
 * Normalize attendance record from API response
 */
export function normalizeAttendance(item: any) {
  return {
    nis: item.nis || "",
    nama: item.nama_siswa || item.nama || "",
    kelas: item.kelas || "-",
    jurusan: item.jurusan || "-",
    jenisSholat: item.jenis_sholat || item.jenisSholat || "-",
    status: capitalizeFirst(item.status || "hadir"),
    tanggal: item.tanggal || new Date().toISOString().split('T')[0],
    waktu: item.waktu || item.created_at,
  };
}

/**
 * Normalize prayer schedule from API response
 */
export function normalizePrayerSchedule(item: any) {
  return {
    id_jadwal: item.id_jadwal || item.id,
    hari: item.hari || "",
    jenis_sholat: item.jenis_sholat || item.jenisSholat || "",
    waktu_mulai: item.waktu_mulai || "",
    waktu_selesai: item.waktu_selesai || "",
    jurusan: item.jurusan || "",
    kelas: item.kelas || "",
  };
}

/**
 * Normalize notification from API response
 */
export function normalizeNotification(item: any) {
  return {
    id: item.id,
    user_id: item.user_id,
    title: item.title || "",
    message: item.message || "",
    type: item.type || "info",
    priority: item.priority || "info",
    is_read: item.is_read || false,
    is_archived: item.is_archived || false,
    related_id: item.related_id,
    delivery_type: item.delivery_type || "notification_center",
    delivered_at: item.delivered_at,
    created_at: item.created_at,
  };
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert gender to API format
 */
export function genderToApi(gender: string): "L" | "P" {
  if (gender === "Perempuan" || gender === "P") return "P";
  return "L";
}

/**
 * Convert gender from API format
 */
export function genderFromApi(jk: string): "Laki-laki" | "Perempuan" {
  return jk === "P" ? "Perempuan" : "Laki-laki";
}

/**
 * Clean Electron IPC boilerplate from error messages.
 * Strips patterns like:
 *   "Error: Error invoking remote method 'login': Error: Too many attempts."
 * down to just:
 *   "Too many attempts."
 */
function stripIpcPrefix(msg: string): string {
  // Remove "Error invoking remote method '...': " wrapper
  let cleaned = msg.replace(/Error invoking remote method '[^']*':\s*/gi, "");
  // Remove leading "Error: " chains (may be repeated)
  cleaned = cleaned.replace(/^(?:Error:\s*)+/i, "");
  return cleaned.trim();
}

/**
 * Handle API errors consistently and return a user-friendly message
 */
export function handleApiError(error: any): string {
  if (typeof error === "string") {
    return stripIpcPrefix(error) || "Terjadi kesalahan saat menghubungi server";
  }

  if (error?.message) {
    return stripIpcPrefix(error.message) || "Terjadi kesalahan saat menghubungi server";
  }

  const str = String(error);
  return stripIpcPrefix(str) || "Terjadi kesalahan saat menghubungi server";
}

/**
 * Build query string from filters
 */
export function buildQueryParams(params: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  
  return result;
}
