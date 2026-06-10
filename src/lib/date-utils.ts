import { format } from "date-fns"
import { id } from "date-fns/locale"

/** Format a Date or date string as DD-MM-YYYY (Indonesian). */
export function formatDateID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return String(date)
  return format(d, "dd-MM-yyyy", { locale: id })
}

/** Format as DD-MM-YYYY HH:MM:SS (for datetime displays). */
export function formatDateTimeID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return String(date)
  return `${format(d, "dd-MM-yyyy", { locale: id })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
}
