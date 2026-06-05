import { useState, useEffect, useCallback, useRef } from "react"
import { Users, Search, Eye, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { notify } from "@/lib/notify"
import { extractData, extractPagination } from "@/lib/api-utils"

interface UnregisteredStudent {
  nis: string
  nama_siswa: string
  kelas: string
  jurusan: string
  jk: string
  status_akademik: string
  wali_kelas_name?: string
}

interface PaginationMeta {
  current_page: number
  page_size: number
  total_items: number
  total_pages: number
}

interface MajorOption {
  id_jurusan: number
  nama_jurusan: string
}

interface TeacherOption {
  id_staff: number
  nama: string
  nip: string
}

export function UnregisteredStudentsSection({ forcedClass }: { forcedClass?: string }) {
  const [students, setStudents] = useState<UnregisteredStudent[]>([])
  const [paginationMeta, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNIS, setSelectedNIS] = useState<Set<string>>(new Set())
  const [isNotifying, setIsNotifying] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<UnregisteredStudent | null>(null)

  // Filter state
  const [nameFilter, setNameFilter] = useState("")
  const [jurusanFilter, setJurusanFilter] = useState("")
  const [waliKelasFilter, setWaliKelasFilter] = useState("")

  // Filter options
  const [majorOptions, setMajorOptions] = useState<MajorOption[]>([])
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [classOptions, setClassOptions] = useState<any[]>([])

  // Debounced name filter value (the value actually sent to API)
  const [debouncedName, setDebouncedName] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [majorsRes, teachersRes, classesRes]: [any, any, any] = await Promise.all([
          window.electronAPI.getMajors(),
          window.electronAPI.getStaffGuruLookup(),
          window.electronAPI.getClasses(),
        ])
        setMajorOptions(extractData(majorsRes))
        setTeacherOptions(extractData(teachersRes))
        setClassOptions(extractData(classesRes))
      } catch (error) {
        console.error("Gagal mengambil opsi filter:", error)
        notify("Gagal mengambil data filter", "error")
      }
    }
    fetchFilterOptions()
  }, [])

  const fetchStudents = useCallback(async (currentPage: number, name: string, jurusan: string, waliKelas: string) => {
    setIsLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: 50,
      }
      if (name.trim()) params.search = name.trim()
      if (jurusan) params.jurusan = jurusan
      if (waliKelas) params.wali_kelas = waliKelas

      if (forcedClass && classOptions.length > 0) {
        const matchedClass = classOptions.find(c => c.label === forcedClass)
        if (matchedClass) {
          params.id_kelas = matchedClass.id_kelas
        }
      }

      const response: any = await window.electronAPI.getUnregisteredStudents(params)
      const data = extractData(response);
      const allStudents = Array.isArray(data) ? data : []
      setStudents(forcedClass ? allStudents.filter((s: any) => s.kelas === forcedClass) : allStudents)
      
      const paginationInfo = extractPagination(response);
      setPagination({
        current_page: paginationInfo.page,
        page_size: paginationInfo.pageSize,
        total_items: paginationInfo.total,
        total_pages: paginationInfo.totalPages,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify(`Gagal mengambil data siswa belum terdaftar: ${message}`, "error")
      setStudents([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [forcedClass, classOptions])

  // Fetch when page or any filter changes
  useEffect(() => {
    fetchStudents(page, debouncedName, jurusanFilter, waliKelasFilter)
  }, [page, debouncedName, jurusanFilter, waliKelasFilter, fetchStudents])

  // Debounced name input handler
  const handleNameChange = (value: string) => {
    setNameFilter(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedName(value)
      setPage(1)
    }, 400)
  }

  // Reset page when dropdown filters change
  const handleJurusanChange = (value: string | null) => {
    const filterValue = !value || value === "__all__" ? "" : value
    setJurusanFilter(filterValue)
    setPage(1)
  }

  const handleWaliKelasChange = (value: string | null) => {
    const filterValue = !value || value === "__all__" ? "" : value
    setWaliKelasFilter(filterValue)
    setPage(1)
  }

  const toggleSelectAll = useCallback(() => {
    if (selectedNIS.size === students.length) {
      setSelectedNIS(new Set())
    } else {
      setSelectedNIS(new Set(students.map((s) => s.nis)))
    }
  }, [students, selectedNIS.size])

  const toggleSelectStudent = useCallback((nis: string) => {
    setSelectedNIS((prev) => {
      const next = new Set(prev)
      if (next.has(nis)) {
        next.delete(nis)
      } else {
        next.add(nis)
      }
      return next
    })
  }, [])

  const handleNotifyWaliKelas = useCallback(async () => {
    if (selectedNIS.size === 0) return
    setIsNotifying(true)
    try {
      await window.electronAPI.notifyWaliKelas({ nis_list: Array.from(selectedNIS) })
      notify("Notifikasi berhasil dikirim ke wali kelas", "success")
      setSelectedNIS(new Set())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify(`Gagal mengirim notifikasi: ${message}`, "error")
    } finally {
      setIsNotifying(false)
    }
  }, [selectedNIS])

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader>
          <CardTitle>Siswa Belum Terdaftar</CardTitle>
          <CardDescription>
            Daftar siswa yang belum memiliki akun terdaftar di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cari Nama</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama siswa..."
                  value={nameFilter}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            {!forcedClass && (
            <div className="min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Konsentrasi Keahlian</label>
              <Select value={jurusanFilter || "__all__"} onValueChange={handleJurusanChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Konsentrasi Keahlian">
                    {!jurusanFilter || jurusanFilter === "__all__"
                      ? "Semua Konsentrasi Keahlian"
                      : majorOptions.find(m => m.id_jurusan.toString() === jurusanFilter)?.nama_jurusan || jurusanFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Konsentrasi Keahlian</SelectItem>
                  {majorOptions.map((major) => (
                    <SelectItem key={major.id_jurusan} value={major.id_jurusan.toString()}>
                      {major.nama_jurusan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            {!forcedClass && (
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Wali Kelas</label>
              <Select value={waliKelasFilter || "__all__"} onValueChange={handleWaliKelasChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Wali Kelas">
                    {!waliKelasFilter || waliKelasFilter === "__all__"
                      ? "Semua Wali Kelas"
                      : teacherOptions.find((t) => t.id_staff.toString() === waliKelasFilter)?.nama || "Semua Wali Kelas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Wali Kelas</SelectItem>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id_staff} value={teacher.id_staff.toString()}>
                      {teacher.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-12 mx-auto mb-4 opacity-20" />
              <p>Tidak ada siswa belum terdaftar yang ditemukan.</p>
            </div>
          ) : (
            <>
              {selectedNIS.size > 0 && (
                <div className="mb-4">
                  <Button
                    onClick={handleNotifyWaliKelas}
                    disabled={isNotifying}
                  >
                    <Bell className="size-4 mr-2" />
                    {isNotifying ? "Mengirim..." : `Kirim Notifikasi ke Wali Kelas (${selectedNIS.size})`}
                  </Button>
                </div>
              )}
              <div className="rounded-md border bg-background overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <Checkbox
                            checked={students.length > 0 && selectedNIS.size === students.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-medium w-32">NIS</th>
                        <th className="px-4 py-3 text-left font-medium">Nama</th>
                        <th className="px-4 py-3 text-left font-medium w-32">Kelas</th>
                        <th className="px-4 py-3 text-left font-medium w-40">Konsentrasi Keahlian</th>
                        <th className="px-4 py-3 text-left font-medium w-44">Wali Kelas</th>
                        <th className="px-4 py-3 text-left font-medium w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.nis} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedNIS.has(student.nis)}
                              onCheckedChange={() => toggleSelectStudent(student.nis)}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">{student.nis}</td>
                          <td className="px-4 py-3">{student.nama_siswa}</td>
                          <td className="px-4 py-3">{student.kelas || "-"}</td>
                          <td className="px-4 py-3">{student.jurusan || "-"}</td>
                          <td className="px-4 py-3">{student.wali_kelas_name || "-"}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <Eye className="size-3" />
                              Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {paginationMeta && paginationMeta.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>
                    Halaman {paginationMeta.current_page} dari {paginationMeta.total_pages} ({paginationMeta.total_items} siswa)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={page >= paginationMeta.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Panel */}
      <Sheet
        open={selectedStudent !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedStudent(null) }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detail Siswa</SheetTitle>
            <SheetDescription>
              Informasi lengkap siswa belum terdaftar.
            </SheetDescription>
          </SheetHeader>

          {selectedStudent && (
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NIS</span>
                  <span className="text-sm font-medium">{selectedStudent.nis}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nama</span>
                  <span className="text-sm">{selectedStudent.nama_siswa}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kelas</span>
                  <span className="text-sm">{selectedStudent.kelas || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Konsentrasi Keahlian</span>
                  <span className="text-sm">{selectedStudent.jurusan || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jenis Kelamin</span>
                  <span className="text-sm">{selectedStudent.jk === "L" ? "Laki-laki" : selectedStudent.jk === "P" ? "Perempuan" : "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status Akademik</span>
                  <span className="text-sm">{selectedStudent.status_akademik || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wali Kelas</span>
                  <span className="text-sm">{selectedStudent.wali_kelas_name || "-"}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
