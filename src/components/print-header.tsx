import { formatDateID } from "@/lib/date-utils"

const SCHOOL_NAME = "SMKN 2 Singosari"

export interface PrintHeaderProps {
  title: string
  subtitle?: string
  filters?: Record<string, string>  // e.g. { "Jurusan": "RPL", "Kelas": "X RPL 1" }
  studentName?: string
  nis?: string
  printDate?: Date  // defaults to new Date()
}

export function PrintHeader(props: PrintHeaderProps) {
  const { title, subtitle, filters, studentName, nis, printDate } = props
  const date = printDate ?? new Date()
  const formattedDate = formatDateID(date)

  const hasFilters = filters && Object.keys(filters).length > 0

  return (
    <div className="hidden print:block mb-6 border-b pb-4">
      {/* School name */}
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold">{SCHOOL_NAME}</h1>
      </div>

      {/* Report title */}
      <div className="text-center mb-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      {/* Filters */}
      <div className="text-sm mt-2">
        <span className="font-medium">Filter: </span>
        {hasFilters ? (
          <span>
            {Object.entries(filters!).map(([key, value], index, arr) => (
              <span key={key}>
                {key}: {value}{index < arr.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        ) : (
          <span>Semua</span>
        )}
      </div>

      {/* Student identity (if provided) */}
      {(studentName || nis) && (
        <div className="text-sm mt-1">
          {studentName && (
            <span className="font-medium">Nama: </span>
          )}
          {studentName && <span>{studentName}</span>}
          {studentName && nis && <span className="mx-2">|</span>}
          {nis && (
            <>
              <span className="font-medium">NIS: </span>
              <span>{nis}</span>
            </>
          )}
        </div>
      )}

      {/* Print date */}
      <div className="text-sm mt-1">
        <span className="font-medium">Tanggal Cetak: </span>
        <span>{formattedDate}</span>
      </div>
    </div>
  )
}
