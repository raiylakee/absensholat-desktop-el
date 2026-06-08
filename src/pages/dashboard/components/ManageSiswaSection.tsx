import { useMemo, useState, useEffect, useRef } from "react"
import { Eye, Filter, Pencil, Plus, Printer, Users, CheckSquare, Settings, Layers, ChevronLeft, ChevronRight, Save, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GENDER_OPTIONS } from "@/pages/dashboard/constants"
import type { Student } from "@/pages/dashboard/types"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData, extractPagination, normalizeStudent, genderToApi } from "@/lib/api-utils"
import { Combobox } from "@/components/ui/combobox"
import { usePrintAction } from "@/hooks/use-print-action"
import { useDownloadAction } from "@/hooks/use-download-action"
import { arrayToXlsxBase64 } from "@/lib/export-xlsx"
import { PrintHeader } from "@/components/print-header"


export function ManageSiswaSection() {
  const { print } = usePrintAction()
  const { isDownloading, download } = useDownloadAction()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJurusanFilters, setSelectedJurusanFilters] = useState<string[]>([])
  const [selectedKelasFilters, setSelectedKelasFilters] = useState<string[]>([])
  const [selectedGenderFilters, setSelectedGenderFilters] = useState<Student["jenisKelamin"][]>([])
  const [selectedAgamaFilter, setSelectedAgamaFilter] = useState<string>("")
  
  const [selectedNis, setSelectedNis] = useState<string[]>([])

  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [addingStudent, setAddingStudent] = useState(false)
  const [dynamicMajorOptions, setDynamicMajorOptions] = useState<any[]>([])
  const [dynamicClassOptions, setDynamicClassOptions] = useState<any[]>([])
  const [dynamicYearOptions, setDynamicYearOptions] = useState<any[]>([])
  const [dynamicClassMap, setDynamicClassMap] = useState<Record<string, string[]>>({})

  const [studentDraft, setStudentDraft] = useState<any>({
    nis: "",
    nama: "",
    id_jurusan: undefined,
    id_kelas: undefined,
    id_tahun_masuk: undefined,
    jk: "Laki-laki",
    agama: "Islam",
    class_status: "active",
    status_akademik: "AKTIF"
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 50

  // Bulk action state
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"mutasi" | "upgrade" | "downgrade" | "lulus" | "hapus" | "ubah_status" | "ubah_tahun_masuk">("mutasi")
  const [bulkMutasiDraft, setBulkMutasiDraft] = useState({ jurusan: "", kelas: "" })
  const [bulkStatusDraft, setBulkStatusDraft] = useState("PKL")
  const [bulkTahunMasukDraft, setBulkTahunMasukDraft] = useState<number | undefined>(undefined)
  const isMounted = useRef(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isReadingCsv, setIsReadingCsv] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set())
  const [importFilterJurusan, setImportFilterJurusan] = useState<string>("")
  const [importFilterKelas, setImportFilterKelas] = useState<string>("")
  const [importFilterIslamOnly, setImportFilterIslamOnly] = useState<boolean>(false)
  const [importSearchQuery, setImportSearchQuery] = useState<string>("")
  const [importProgressStep, setImportProgressStep] = useState<string>("")
  const [importProgressPct, setImportProgressPct] = useState<number>(0)

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      let filterTingkatan: number | undefined = undefined
      let filterJurusan: string | undefined = selectedJurusanFilters.length > 0 ? selectedJurusanFilters[0] : undefined
      let filterPart: string | undefined = undefined

      if (selectedKelasFilters.length > 0) {
        const classObj = dynamicClassOptions.find(c => c.label === selectedKelasFilters[0])
        if (classObj) {
          filterTingkatan = classObj.tingkatan
          filterPart = classObj.part
          if (!filterJurusan) {
            filterJurusan = classObj.jurusan
          }
        }
      }

      const response: any = await window.electronAPI.getStudents({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        jurusan: filterJurusan,
        tingkatan: filterTingkatan,
        part: filterPart,
        jk: selectedGenderFilters.length > 0 ? genderToApi(selectedGenderFilters[0]) : undefined,
        agama: selectedAgamaFilter || undefined,
      })
      if (!isMounted.current) return
      const data = extractData(response);
      const mapped: Student[] = Array.isArray(data) ? data.map(normalizeStudent) : [];
      setStudents(mapped)
      setSelectedNis([])
      const paginationInfo = extractPagination(response);
      setTotalPages(paginationInfo.totalPages);
      setTotalItems(paginationInfo.total);
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil data siswa:", error)
      notify("Gagal mengambil data siswa", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const fetchFilters = async () => {
    try {
      const [majorsRes, classesRes, yearsRes]: any = await Promise.all([
        window.electronAPI.getMajors(),
        window.electronAPI.getClasses(),
        window.electronAPI.getAcademicYears(),
      ])
      if (!isMounted.current) return
      const majors = extractData(majorsRes)
      const classes = extractData(classesRes)
      const years = extractData(yearsRes)
      if (Array.isArray(majors)) setDynamicMajorOptions(majors)
      if (Array.isArray(classes)) {
        setDynamicClassOptions(classes)
        const map: Record<string, string[]> = {}
        classes.forEach((c: any) => {
          const major = c.jurusan || "General"
          if (!map[major]) map[major] = []
          map[major].push(c.label)
        })
        setDynamicClassMap(map)
      }
      if (Array.isArray(years)) setDynamicYearOptions(years)
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil filter:", error)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchFilters()
    return () => { isMounted.current = false }
  }, [])

  const handleImport = async () => {
    const selected = await window.electronAPI.showOpenDialog({
      multiple: false,
      filters: [{ name: "CSV/Excel", extensions: ["csv", "xlsx", "xls"] }],
    })
    if (!selected) return
    setIsReadingCsv(true)
    setImportProgressStep("Membuka file...")
    setImportProgressPct(10)
    try {
      const content = await window.electronAPI.readFile({ filePath: selected as string })
      setImportProgressStep("Membaca baris data...")
      setImportProgressPct(30)
      const lines: string[] = (content as string).split("\n").filter((l: string) => l.trim())
      if (lines.length < 2) { notify("File kosong atau tidak valid", "error"); return }
      const headers: string[] = lines[0].split(",").map((h: string) => h.trim().toLowerCase())
      const colIdx: Record<string, number> = {}
      headers.forEach((h: string, i: number) => { colIdx[h] = i })
      const required = ["nis", "nama_siswa", "jk", "tingkatan", "jurusan", "part"]
      for (const r of required) {
        if (!(r in colIdx)) { notify(`Kolom '${r}' tidak ditemukan`, "error"); return }
      }
      setImportProgressStep("Memproses data siswa...")
      setImportProgressPct(60)
      const rows = lines.slice(1).map((line: string, idx: number) => {
        const cols = line.split(",")
        return {
          _idx: idx,
          nis: cols[colIdx["nis"]]?.trim() || "",
          nama_siswa: cols[colIdx["nama_siswa"]]?.trim() || "",
          jk: cols[colIdx["jk"]]?.trim() || "",
          agama: colIdx["agama"] !== undefined ? (cols[colIdx["agama"]]?.trim() || "Islam") : "Islam",
          tingkatan: cols[colIdx["tingkatan"]]?.trim() || "",
          jurusan: cols[colIdx["jurusan"]]?.trim() || "",
          part: cols[colIdx["part"]]?.trim() || "",
          kelas: `${cols[colIdx["tingkatan"]]?.trim()} ${cols[colIdx["jurusan"]]?.trim()} ${cols[colIdx["part"]]?.trim()}`,
        }
      }).filter((r: { nis: string; nama_siswa: string }) => r.nis && r.nama_siswa)
      setImportProgressStep(`Ditemukan ${rows.length} siswa, menyiapkan pratinjau...`)
      setImportProgressPct(90)
      setImportPreview(rows)
      setImportSelected(new Set(rows.map((_: unknown, i: number) => i)))
      setImportFilterJurusan("")
      setImportFilterKelas("")
      setImportFilterIslamOnly(false)
      setImportSearchQuery("")
      setImportResult(null)
      setImportProgressPct(100)
      setImportProgressStep("Selesai membaca file.")
      setImportDialogOpen(true)
    } catch (e: any) {
      notify("Gagal membaca file: " + e, "error")
    } finally {
      setIsReadingCsv(false)
    }
  }

  const executeImport = async () => {
    const selectedRows = importPreview.filter((_, i) => importSelected.has(i))
    if (selectedRows.length === 0) { notify("Tidak ada siswa yang dipilih", "error"); return }
    setIsImporting(true)
    setImportProgressStep("Menyiapkan data untuk dikirim...")
    setImportProgressPct(10)
    try {
      const payload = selectedRows.map(r => ({
        nis: r.nis, nama_siswa: r.nama_siswa, jk: r.jk,
        agama: r.agama || "Islam",
        tingkatan: r.tingkatan, jurusan: r.jurusan, part: r.part,
      }))
      setImportProgressStep(`Mengirim ${payload.length} data siswa ke server...`)
      setImportProgressPct(40)
      const res: any = await window.electronAPI.importStudentsJson({ body: { students: payload } })
      setImportProgressStep("Memperbarui data lokal...")
      setImportProgressPct(80)
      setImportResult(res?.data || res)
      setImportPreview([])
      setImportProgressPct(100)
      setImportProgressStep("Impor selesai.")
      notify(res?.message || "Impor selesai", "success")
      fetchStudents()
      fetchFilters()
    } catch (e: any) {
      notify(e || "Impor gagal", "error")
    } finally {
      setIsImporting(false)
    }
  }

  const importJurusanOptions = useMemo(() => [...new Set(importPreview.map(r => r.jurusan))], [importPreview])
  const importKelasOptions = useMemo(() => [...new Set(importPreview.map(r => r.kelas))], [importPreview])
  const filteredImportPreview = useMemo(() => {
    return importPreview.filter((r) => {
      if (importFilterJurusan && r.jurusan !== importFilterJurusan) return false
      if (importFilterKelas && r.kelas !== importFilterKelas) return false
      if (importFilterIslamOnly && (r.agama || "Islam") !== "Islam") return false
      if (importSearchQuery) {
        const q = importSearchQuery.toLowerCase()
        if (!r.nis.toLowerCase().includes(q) && !r.nama_siswa.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [importPreview, importFilterJurusan, importFilterKelas, importFilterIslamOnly, importSearchQuery])

  // Count of filtered rows that are selected
  const filteredSelectedCount = useMemo(
    () => filteredImportPreview.filter(r => importSelected.has(r._idx)).length,
    [filteredImportPreview, importSelected]
  )

  useEffect(() => {
    if (!isMounted.current) return
    fetchStudents()
  }, [currentPage])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        fetchStudents()
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, selectedJurusanFilters, selectedKelasFilters, selectedGenderFilters, selectedAgamaFilter])

  const classOptionsForFilter = useMemo(() => {
    if (selectedJurusanFilters.length === 0) return []
    const selectedJurusan = selectedJurusanFilters[0]
    return Array.from(
      new Set(
        dynamicClassOptions
          .filter((c: any) => c.jurusan === selectedJurusan)
          .map((c: any) => c.label)
      )
    )
  }, [dynamicClassOptions, selectedJurusanFilters])

  const filteredStudents = useMemo(() => {
    if (selectedKelasFilters.length === 0) return students
    return students.filter(s => selectedKelasFilters.includes(s.kelas))
  }, [selectedKelasFilters, students])

  const activeFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (selectedJurusanFilters.length > 0) filters["Konsentrasi Keahlian"] = selectedJurusanFilters.join(", ")
    if (selectedKelasFilters.length > 0) filters["Kelas"] = selectedKelasFilters.join(", ")
    if (selectedGenderFilters.length > 0) filters["Jenis Kelamin"] = selectedGenderFilters.join(", ")
    if (selectedAgamaFilter) filters["Agama"] = selectedAgamaFilter
    return filters
  }, [selectedJurusanFilters, selectedKelasFilters, selectedGenderFilters, selectedAgamaFilter])

  const openAddStudentDialog = () => {
    const activeYear = dynamicYearOptions.find(y => y.is_active) || dynamicYearOptions[0]
    setStudentDraft({
      nis: "",
      nama: "",
      id_jurusan: dynamicMajorOptions[0]?.id_jurusan,
      id_kelas: dynamicClassOptions[0]?.id_kelas,
      id_tahun_masuk: activeYear?.id_tahun_masuk,
      jk: "Laki-laki",
      agama: "Islam",
      class_status: "active",
      status_akademik: "AKTIF"
    })
    setAddingStudent(true)
  }

  const openEditStudentDialog = (student: Student) => {
    // Find IDs from metadata if not present in the student object
    const idJurusan = (student as any).id_jurusan || dynamicMajorOptions.find(m => m.nama_jurusan === student.jurusan)?.id_jurusan
    const idKelas = (student as any).id_kelas || dynamicClassOptions.find(k => k.label === student.kelas)?.id_kelas
    const idYear = (student as any).id_tahun_masuk || dynamicYearOptions.find(y => y.is_active)?.id_tahun_masuk || dynamicYearOptions[0]?.id_tahun_masuk

    setStudentDraft({
      ...student,
      nama: student.nama,
      id_jurusan: idJurusan,
      id_kelas: idKelas,
      id_tahun_masuk: idYear,
      jk: student.jenisKelamin,
      agama: (student as any).agama || "Islam",
      class_status: (student as any).class_status || "active",
      status_akademik: (student as any).status_akademik || "AKTIF"
    })
    setEditingStudent(student)
  }

  const saveStudentDraft = async (_closeDialog = true) => {
    const draft = { ...studentDraft, nis: studentDraft.nis.trim(), nama: studentDraft.nama.trim() }
    if (!draft.nis || !draft.nama) return
    
    setIsSaving(true)
    try {
      if (addingStudent) {
        const createPayload = {
          nis: draft.nis,
          nama_siswa: draft.nama,
          jk: genderToApi(draft.jk),
          agama: draft.agama || "Islam",
          id_jurusan: draft.id_jurusan,
          id_kelas: draft.id_kelas,
          id_tahun_masuk: draft.id_tahun_masuk,
          class_status: draft.class_status || "active",
          status_akademik: draft.status_akademik || "AKTIF"
        }
        console.log("📝 Creating student with payload:", createPayload)
        await window.electronAPI.createStudent({
          body: createPayload
        })
        notify("Siswa berhasil ditambahkan", "success")
      } else if (editingStudent) {
        const updatePayload = {
          nama_siswa: draft.nama,
          jk: genderToApi(draft.jk),
          agama: draft.agama || "Islam",
          id_jurusan: draft.id_jurusan,
          id_kelas: draft.id_kelas,
          id_tahun_masuk: draft.id_tahun_masuk,
          class_status: draft.class_status || "active",
          status_akademik: draft.status_akademik || "AKTIF"
        }
        console.log("✏️ Updating student NIS:", editingStudent.nis)
        console.log("✏️ Update payload:", updatePayload)
        await window.electronAPI.updateStudent({
          nis: editingStudent.nis,
          body: updatePayload
        })
        notify("Data siswa berhasil diperbarui", "success")
      }
      
      console.log("🔄 Fetching students after save...")
      await fetchStudents()
      // Always close dialog after successful save
      setAddingStudent(false)
      setEditingStudent(null)
    } catch (error) {
      console.error("❌ Error saving student:", error)
      notify("Gagal menyimpan data siswa: " + error, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const currentEditIndex = editingStudent ? filteredStudents.findIndex(s => s.nis === editingStudent.nis) : -1

  const handlePrevStudent = () => {
    if (currentEditIndex > 0) {
      openEditStudentDialog(filteredStudents[currentEditIndex - 1])
    }
  }

  const handleNextStudent = () => {
    if (currentEditIndex < filteredStudents.length - 1) {
      openEditStudentDialog(filteredStudents[currentEditIndex + 1])
    }
  }

  const saveAndNext = () => {
    saveStudentDraft(false) // Don't close
    if (currentEditIndex < filteredStudents.length - 1) {
      const nextStudent = filteredStudents[currentEditIndex + 1]
      openEditStudentDialog(nextStudent)
    } else {
      setEditingStudent(null) // Close if it was the last one
    }
  }

  const toggleSelectAll = () => {
    if (selectedNis.length === filteredStudents.length) {
      setSelectedNis([])
    } else {
      setSelectedNis(filteredStudents.map((s) => s.nis))
    }
  }

  const toggleSelectStudent = (nis: string) => {
    setSelectedNis((prev) =>
      prev.includes(nis) ? prev.filter((id) => id !== nis) : [...prev, nis]
    )
  }

  const handleExecuteBulkAction = async () => {
    if (selectedNis.length === 0) return
    
    setIsSaving(true)
    try {
      switch (bulkActionType) {
        case "hapus":
          for (const nis of selectedNis) {
            await window.electronAPI.deleteStudent({ nis })
          }
          notify(`${selectedNis.length} siswa berhasil dihapus`, "success")
          break

        case "mutasi":
          await window.electronAPI.bulkStudentControl({
            body: {
              nis_list: selectedNis,
              action: "set_class",
              target_class: bulkMutasiDraft.kelas,
              note: "Mutasi massal dari Dashboard Desktop"
            }
          })
          notify(`${selectedNis.length} siswa berhasil dimutasi`, "success")
          break

        case "upgrade":
          for (const nis of selectedNis) {
            const student = students.find(s => s.nis === nis)
            if (!student || !student.jurusan || !student.part) continue
            const currentTingkatan = parseInt(student.kelas.split(" ")[0]) || 0
            if (currentTingkatan < 10 || currentTingkatan > 12) continue
            const nextTingkatan = currentTingkatan + 1
            if (nextTingkatan > 12) {
              await window.electronAPI.bulkStudentControl({
                body: { nis_list: [nis], action: "mark_dropout", note: "Lulus otomatis" }
              })
            } else {
              const targetClass = `${nextTingkatan} ${student.jurusan} ${student.part}`
              await window.electronAPI.bulkStudentControl({
                body: { nis_list: [nis], action: "promote", target_class: targetClass, note: "Naik kelas otomatis" }
              })
            }
          }
          notify(`${selectedNis.length} siswa berhasil dinaikkan`, "success")
          break

        case "downgrade":
          for (const nis of selectedNis) {
            const student = students.find(s => s.nis === nis)
            if (!student || !student.jurusan || !student.part) continue
            const currentTingkatan = parseInt(student.kelas.split(" ")[0]) || 0
            if (currentTingkatan < 10 || currentTingkatan > 12) continue
            const prevTingkatan = currentTingkatan - 1
            if (prevTingkatan < 10) {
              notify(`Siswa ${nis} sudah di tingkat terendah (10)`, "warning")
              continue
            }
            const targetClass = `${prevTingkatan} ${student.jurusan} ${student.part}`
            await window.electronAPI.bulkStudentControl({
              body: { nis_list: [nis], action: "demote", target_class: targetClass, note: "Tinggal kelas otomatis" }
            })
          }
          notify(`${selectedNis.length} siswa berhasil diturunkan`, "success")
          break

        case "lulus":
          await window.electronAPI.bulkStudentControl({
            body: {
              nis_list: selectedNis,
              action: "mark_dropout",
              note: "Kelulusan massal dari Dashboard Desktop"
            }
          })
          notify(`${selectedNis.length} siswa berhasil diluluskan`, "success")
          break

        case "ubah_status":
          await window.electronAPI.bulkUpdateStudentFields({
            body: {
              nis_list: selectedNis,
              status_akademik: bulkStatusDraft
            }
          })
          notify(`Status ${selectedNis.length} siswa diubah ke ${bulkStatusDraft}`, "success")
          break

        case "ubah_tahun_masuk":
          await window.electronAPI.bulkUpdateStudentFields({
            body: {
              nis_list: selectedNis,
              id_tahun_masuk: bulkTahunMasukDraft
            }
          })
          notify(`Tahun masuk ${selectedNis.length} siswa berhasil diperbarui`, "success")
          break
      }
      
      setSelectedNis([])
      setBulkActionOpen(false)
      await fetchStudents()
    } catch (error) {
      console.error("Bulk action error:", error)
      const errMsg = error instanceof Error ? error.message : String(error)
      notify("Gagal menjalankan aksi massal: " + errMsg, "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kelas Aktif</CardTitle>
            <Settings className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classOptionsForFilter.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Konsentrasi Keahlian</CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dynamicMajorOptions.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kelola Siswa</CardTitle>
            <CardDescription className="mt-1">Manajemen komprehensif: mutasi, kenaikan, dan kelulusan.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari siswa..."
              className="w-[220px]"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    <Filter className="mr-2 size-4" />
                    Filter
                  </Button>
                }
              />
              <DropdownMenuContent className="w-64">
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Konsentrasi Keahlian</p>
                 {dynamicMajorOptions.map((major) => {
                  const label = typeof major === 'string' ? major : major.nama_jurusan
                  return (
                    <DropdownMenuCheckboxItem
                      key={`filter-major-${label}`}
                      checked={selectedJurusanFilters.includes(label)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) => {
                        setSelectedJurusanFilters(checked ? [label] : [])
                        setSelectedKelasFilters([]) // Clear class selection when major changes
                      }}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  )
                })}
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Kelas</p>
                {selectedJurusanFilters.length === 0 ? (
                  <p className="px-6 py-2 text-xs italic text-muted-foreground">Pilih konsentrasi keahlian terlebih dahulu</p>
                ) : (
                  classOptionsForFilter.map((kelas) => (
                    <DropdownMenuCheckboxItem
                      key={`filter-class-${kelas}`}
                      checked={selectedKelasFilters.includes(kelas)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedKelasFilters(checked ? [kelas] : [])
                      }
                    >
                      {kelas}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Jenis Kelamin</p>
                {GENDER_OPTIONS.map((gender) => (
                  <DropdownMenuCheckboxItem
                    key={`filter-gender-${gender}`}
                    checked={selectedGenderFilters.includes(gender)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) =>
                      setSelectedGenderFilters(checked ? [gender] : [])
                    }
                  >
                    {gender}
                  </DropdownMenuCheckboxItem>
                ))}
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Agama</p>
                {["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"].map((agama) => (
                  <DropdownMenuCheckboxItem
                    key={`filter-agama-${agama}`}
                    checked={selectedAgamaFilter === agama}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) =>
                      setSelectedAgamaFilter(checked ? agama : "")
                    }
                  >
                    {agama}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openAddStudentDialog}>
              <Plus className="mr-2 size-4" />
              Tambah Siswa
            </Button>
            <Button variant="outline" onClick={handleImport} disabled={isImporting || isReadingCsv}>
              {isReadingCsv ? <Spinner className="mr-2 size-4" /> : <Upload className="mr-2 size-4" />}
              {isReadingCsv ? "Membaca file..." : "Impor"}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (filteredStudents.length === 0) {
                        notify("Tidak ada data siswa untuk diunduh", "info")
                        return
                      }
                      const activeJurusan = selectedJurusanFilters.length > 0 ? selectedJurusanFilters[0] : undefined
                      download({
                        filenameOptions: {
                          dataType: 'data-siswa',
                          format: 'xlsx',
                          filter: activeJurusan,
                        },
                        dialogFilters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
                        fetchData: async () => {
                          const headers = ['NIS', 'Nama', 'Jenis Kelamin', 'Agama', 'Konsentrasi Keahlian', 'Kelas', 'Status Akademik']
                          const rows = filteredStudents.map(s => [
                            s.nis,
                            s.nama,
                            s.jenisKelamin,
                            (s as any).agama || 'Islam',
                            s.jurusan,
                            s.kelas,
                            (s as any).status_akademik || '',
                          ])
                          const data = arrayToXlsxBase64(headers, rows)
                          return { data, encoding: 'base64' }
                        },
                      })
                    }}
                    disabled={isDownloading || filteredStudents.length === 0}
                  >
                    {isDownloading ? <Spinner className="mr-2 size-4" /> : <Download className="mr-2 size-4" />}
                    Unduh
                  </Button>
                </TooltipTrigger>
                {filteredStudents.length === 0 && (
                  <TooltipContent>
                    <p>Tidak ada data siswa untuk diunduh</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button
                    variant="outline"
                    onClick={print}
                    disabled={filteredStudents.length === 0}
                  >
                    <Printer className="mr-2 size-4" />
                    Cetak
                  </Button>
                </TooltipTrigger>
                {filteredStudents.length === 0 && (
                  <TooltipContent>
                    <p>Tidak ada data siswa untuk dicetak</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {selectedNis.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border bg-primary/5 p-3 overflow-x-auto shadow-sm">
              <span className="text-sm font-semibold px-2 whitespace-nowrap">{selectedNis.length} siswa terpilih</span>
              <div className="flex-1" />
              {selectedNis.length === 1 && (
                <>
                  <Button variant="outline" size="sm" className="whitespace-nowrap bg-background" onClick={() => {
                    const student = students.find(s => s.nis === selectedNis[0])
                    if (student) setDetailStudent(student)
                  }}>
                    <Eye className="mr-2 size-4" /> Lihat Detail
                  </Button>
                  <Button variant="outline" size="sm" className="whitespace-nowrap bg-background" onClick={() => {
                    const student = students.find(s => s.nis === selectedNis[0])
                    if (student) openEditStudentDialog(student)
                  }}>
                    <Pencil className="mr-2 size-4" /> Edit / Mutasi
                  </Button>
                </>
              )}
              <Button onClick={() => setBulkActionOpen(true)} variant="secondary" className="whitespace-nowrap shadow-sm">
                <Layers className="mr-2 size-4" /> Manajemen Massal
              </Button>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <PrintHeader title="Daftar Siswa" filters={activeFilters} />
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 print:hidden">
                    <Checkbox
                      checked={filteredStudents.length > 0 && selectedNis.length === filteredStudents.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>No</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Agama</TableHead>
                  <TableHead>Konsentrasi Keahlian</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <Spinner className="mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Data tidak ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.nis}>
                      <TableCell className="print:hidden">
                        <Checkbox
                          checked={selectedNis.includes(student.nis)}
                          onCheckedChange={() => toggleSelectStudent(student.nis)}
                        />
                      </TableCell>
                      <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="font-medium">{student.nis}</TableCell>
                      <TableCell>{student.nama}</TableCell>
                      <TableCell>{(student as any).agama || "Islam"}</TableCell>
                      <TableCell>{student.jurusan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold bg-primary/5">{student.kelas}</Badge>
                      </TableCell>
                      <TableCell>
                        {["KELUAR", "ALUMNI", "KEK", "PKL"].includes(student.status_akademik ?? "") ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Tidak Aktif</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Siswa Aktif</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredStudents.length} dari {totalItems} siswa
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Sebelumnya
              </Button>
              <span className="text-sm font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manajemen Massal Siswa</DialogTitle>
            <DialogDescription>Terapkan aksi serentak untuk {selectedNis.length} siswa terpilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Jenis Aksi Massal</Label>
              <Select value={bulkActionType} onValueChange={(v) => setBulkActionType(v as typeof bulkActionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {{ mutasi: "Mutasi / Pindah Kelas Spesifik", upgrade: "Naik Kelas Otomatis (1 Tingkat)", downgrade: "Tinggal Kelas Otomatis (1 Tingkat)", lulus: "Luluskan Semua Siswa", ubah_status: "Ubah Status Akademik", ubah_tahun_masuk: "Ubah Tahun Masuk", hapus: "Hapus Data Siswa" }[bulkActionType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mutasi">Mutasi / Pindah Kelas Spesifik</SelectItem>
                  <SelectItem value="upgrade">Naik Kelas Otomatis (1 Tingkat)</SelectItem>
                  <SelectItem value="downgrade">Tinggal Kelas Otomatis (1 Tingkat)</SelectItem>
                  <SelectItem value="lulus">Luluskan Semua Siswa</SelectItem>
                  <SelectItem value="ubah_status">Ubah Status Akademik</SelectItem>
                  <SelectItem value="ubah_tahun_masuk">Ubah Tahun Masuk</SelectItem>
                  <SelectItem value="hapus" className="text-destructive">Hapus Data Siswa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkActionType === "mutasi" && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label>Konsentrasi Keahlian Tujuan</Label>
                  <Combobox
                    options={dynamicMajorOptions.map((m: any) => {
                      const label = typeof m === 'string' ? m : m.nama_jurusan
                      return { value: label, label }
                    })}
                    value={bulkMutasiDraft.jurusan}
                    onValueChange={(v) => v && setBulkMutasiDraft({ jurusan: v, kelas: "" })}
                    placeholder="Pilih Konsentrasi Keahlian"
                    searchPlaceholder="Cari konsentrasi keahlian..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kelas Tujuan</Label>
                  <Combobox
                    options={(dynamicClassMap[bulkMutasiDraft.jurusan] || []).map(k => ({ value: k, label: k }))}
                    value={bulkMutasiDraft.kelas}
                    onValueChange={(v) => v && setBulkMutasiDraft(prev => ({ ...prev, kelas: v }))}
                    placeholder="Pilih Kelas"
                    searchPlaceholder="Cari kelas..."
                    disabled={!bulkMutasiDraft.jurusan}
                  />
                </div>
              </div>
            )}

            {bulkActionType === "upgrade" && (
              <div className="rounded-lg border p-4 bg-emerald-50 text-emerald-800 text-sm">
                <strong>Informasi Kenaikan Kelas:</strong> Semua siswa yang dipilih akan otomatis naik satu tingkat sesuai dengan konsentrasi keahliannya. Siswa kelas X menjadi XI, kelas XI menjadi XII, dan kelas XII akan diluluskan.
              </div>
            )}
            
            {bulkActionType === "ubah_status" && (
              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <Label>Status Akademik Baru</Label>
                <Select value={bulkStatusDraft} onValueChange={(v) => v && setBulkStatusDraft(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["AKTIF", "PKL", "KEK", "MUTASI", "KELUAR", "ALUMNI"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkActionType === "ubah_tahun_masuk" && (
              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <Label>Tahun Masuk Baru</Label>
                <Select
                  value={bulkTahunMasukDraft !== undefined ? String(bulkTahunMasukDraft) : ""}
                  onValueChange={(v) => setBulkTahunMasukDraft(v ? Number(v) : undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicYearOptions.map(y => (
                      <SelectItem key={y.id_tahun_masuk} value={String(y.id_tahun_masuk)}>
                        {y.tahun}{y.is_active ? " (Aktif)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkActionType === "hapus" && (
              <div className="rounded-lg border p-4 bg-destructive/10 text-destructive text-sm">
                <strong>Peringatan:</strong> Data {selectedNis.length} siswa akan dihapus permanen. Laporan presensi yang terkait mungkin akan kehilangan referensi.
              </div>
            )}

            <div className="space-y-2">
              <Label>Daftar Siswa Terdampak ({selectedNis.length})</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border text-sm">
                {students.filter(s => selectedNis.includes(s.nis)).map(s => (
                  <div key={`bulk-${s.nis}`} className="flex items-center justify-between border-b px-3 py-2 last:border-0 hover:bg-muted/30">
                    <div>
                      <span className="font-medium">{s.nama}</span> <span className="text-muted-foreground text-xs">({s.nis})</span>
                    </div>
                    <Badge variant="outline">{s.kelas}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkActionOpen(false)}>Batal</Button>
              <Button
                variant={bulkActionType === 'hapus' ? 'destructive' : 'default'}
                onClick={handleExecuteBulkAction}
                disabled={isSaving || (bulkActionType === 'ubah_tahun_masuk' && bulkTahunMasukDraft === undefined)}
              >
                {isSaving ? 'Memproses...' : bulkActionType === 'hapus' ? 'Hapus Data Permanen' : 'Konfirmasi & Terapkan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailStudent)} onOpenChange={(open) => !open && setDetailStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {detailStudent && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">NIS:</span> {detailStudent.nis}</p>
              <p><span className="text-muted-foreground">Nama:</span> {detailStudent.nama}</p>
              <p><span className="text-muted-foreground">Konsentrasi Keahlian:</span> {detailStudent.jurusan}</p>
              <p><span className="text-muted-foreground">Kelas:</span> {detailStudent.kelas}</p>
              <p><span className="text-muted-foreground">Jenis Kelamin:</span> {detailStudent.jenisKelamin}</p>
              <p><span className="text-muted-foreground">Agama:</span> {(detailStudent as any).agama || "Islam"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Edit Student Dialog */}
      <Dialog open={Boolean(editingStudent) || addingStudent} onOpenChange={(open) => !open && (setEditingStudent(null), setAddingStudent(false))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{addingStudent ? "Tambah Siswa Baru" : "Ubah / Mutasi Siswa"}</DialogTitle>
            <DialogDescription>
              {addingStudent ? "Tambahkan data siswa ke dalam sistem." : "Perbarui data atau mutasi siswa ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-nis">NIS</Label>
              <Input
                id="student-nis"
                value={studentDraft.nis}
                onChange={(event) => setStudentDraft((current: any) => ({ ...current, nis: event.target.value }))}
                disabled={!addingStudent}
                className={!addingStudent ? "bg-muted/50" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-nama">Nama Siswa</Label>
              <Input
                id="student-nama"
                value={studentDraft.nama}
                onChange={(event) => setStudentDraft((current: any) => ({ ...current, nama: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Konsentrasi Keahlian</Label>
                <Combobox
                  options={dynamicMajorOptions.map((m: any) => ({ value: String(m.id_jurusan), label: m.nama_jurusan }))}
                  value={studentDraft.id_jurusan !== undefined ? String(studentDraft.id_jurusan) : ""}
                  onValueChange={(v) => {
                    const major = dynamicMajorOptions.find((m: any) => String(m.id_jurusan) === v)
                    if (major) {
                      setStudentDraft((current: any) => ({
                        ...current,
                        id_jurusan: major.id_jurusan,
                        jurusan: major.nama_jurusan,
                        id_kelas: undefined,
                        kelas: undefined
                      }))
                    }
                  }}
                  placeholder="Pilih Konsentrasi Keahlian"
                  searchPlaceholder="Cari konsentrasi keahlian..."
                />
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Combobox
                  options={dynamicClassOptions
                    .filter((k: any) => !studentDraft.id_jurusan || k.id_jurusan === studentDraft.id_jurusan || k.jurusan === studentDraft.jurusan)
                    .map((k: any) => ({ value: String(k.id_kelas), label: k.label }))}
                  value={studentDraft.id_kelas !== undefined ? String(studentDraft.id_kelas) : ""}
                  onValueChange={(v) => {
                    const kelas = dynamicClassOptions.find((k: any) => String(k.id_kelas) === v)
                    if (kelas) {
                      setStudentDraft((current: any) => ({
                        ...current,
                        id_kelas: kelas.id_kelas,
                        kelas: kelas.label
                      }))
                    }
                  }}
                  placeholder="Pilih Kelas"
                  searchPlaceholder="Cari kelas..."
                  disabled={!studentDraft.id_jurusan}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tahun Masuk</Label>
                <Combobox
                  options={dynamicYearOptions.map((y: any) => ({
                    value: String(y.id_tahun_masuk),
                    label: y.tahun + (y.is_active ? " (Aktif)" : "")
                  }))}
                  value={studentDraft.id_tahun_masuk !== undefined ? String(studentDraft.id_tahun_masuk) : ""}
                  onValueChange={(v) => setStudentDraft((current: any) => ({ ...current, id_tahun_masuk: Number(v) }))}
                  placeholder="Pilih Tahun"
                  searchPlaceholder="Cari tahun..."
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select
                  value={studentDraft.jk || studentDraft.jenisKelamin || ""}
                  onValueChange={(v) => setStudentDraft((current: any) => ({ ...current, jk: v, jenisKelamin: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih">
                      {(studentDraft.jk || studentDraft.jenisKelamin) === "L" ? "Laki-laki" : (studentDraft.jk || studentDraft.jenisKelamin) === "P" ? "Perempuan" : (studentDraft.jk || studentDraft.jenisKelamin || "Pilih")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="student-gender-L" value="L">Laki-laki</SelectItem>
                    <SelectItem key="student-gender-P" value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agama</Label>
              <Select
                value={studentDraft.agama || "Islam"}
                onValueChange={(v) => setStudentDraft((current: any) => ({ ...current, agama: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"].map((a) => (
                    <SelectItem key={`agama-${a}`} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!addingStudent && (
              <div className="space-y-2">
                <Label>Status Akademik</Label>
                <Select
                  value={studentDraft.status_akademik || "AKTIF"}
                  onValueChange={(v) => setStudentDraft((current: any) => ({ ...current, status_akademik: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["AKTIF", "PKL", "KEK", "MUTASI", "KELUAR", "ALUMNI"].map((s) => (
                      <SelectItem key={`status-${s}`} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-4 border-t">
              {editingStudent && !addingStudent ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="icon" onClick={handlePrevStudent} disabled={currentEditIndex <= 0} title="Siswa Sebelumnya">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextStudent} disabled={currentEditIndex >= filteredStudents.length - 1} title="Siswa Selanjutnya">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : <div />}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button variant="ghost" onClick={() => (setAddingStudent(false), setEditingStudent(null))} disabled={isSaving}>
                  Batal
                </Button>
                {editingStudent && currentEditIndex < filteredStudents.length - 1 ? (
                  <Button onClick={saveAndNext} className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                    {isSaving ? <Spinner size="sm" /> : <><Save className="mr-2 size-4" /> Simpan & Lanjut</>}
                  </Button>
                ) : (
                  <Button onClick={() => saveStudentDraft(true)} disabled={isSaving}>
                    {isSaving ? <Spinner size="sm" /> : "Simpan Perubahan"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingStudent)} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Siswa</DialogTitle>
            <DialogDescription>Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingStudent(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={isSaving}
              onClick={async () => {
                if (!deletingStudent) return
                setIsSaving(true)
                try {
                  await window.electronAPI.deleteStudent({ nis: deletingStudent.nis })
                  notify("Siswa berhasil dihapus", "success")
                  await fetchStudents()
                  setDeletingStudent(null)
                } catch (error) {
                  notify("Gagal menghapus siswa: " + error, "error")
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              {isSaving ? <Spinner size="sm" /> : "Hapus Permanen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Import Preview & Result Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{importResult ? "Hasil Impor" : "Pratinjau Impor Siswa"}</DialogTitle>
            <DialogDescription>
              {importResult
                ? "Ringkasan proses impor siswa."
                : `${importPreview.length} siswa ditemukan, ${importSelected.size} dipilih untuk diimpor.`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          {(isReadingCsv || isImporting) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{importProgressStep}</span>
                <span>{importProgressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {importResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-green-600">{importResult.created ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Ditambahkan</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.skipped ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Dilewati</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-blue-600">{importResult.classes_created ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Kelas Baru</div>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded border p-2 text-xs text-red-600">
                  {importResult.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setImportResult(null); setImportDialogOpen(false) }}>
                  Tutup
                </Button>
                <Button onClick={() => { setImportResult(null); handleImport() }}>
                  Import Lagi
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Filters + search */}
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Cari NIS atau nama..."
                  className="h-8 w-[180px] text-xs"
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                />
                <Select
                  value={importFilterJurusan || "Semua Konsentrasi Keahlian"}
                  onValueChange={(v) => setImportFilterJurusan(v === "Semua Konsentrasi Keahlian" || !v ? "" : v)}
                >
                  <SelectTrigger size="sm" className="w-auto min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Konsentrasi Keahlian">Semua Konsentrasi Keahlian</SelectItem>
                    {importJurusanOptions.map(j => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={importFilterKelas || "Semua Kelas"}
                  onValueChange={(v) => setImportFilterKelas(v === "Semua Kelas" || !v ? "" : v)}
                >
                  <SelectTrigger size="sm" className="w-auto min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Kelas">Semua Kelas</SelectItem>
                    {importKelasOptions.map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={importFilterIslamOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportFilterIslamOnly(v => !v)}
                >
                  Hanya Islam
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const visibleIdxs = filteredImportPreview.map(r => r._idx)
                    const allSelected = visibleIdxs.every(i => importSelected.has(i))
                    const next = new Set(importSelected)
                    visibleIdxs.forEach(i => allSelected ? next.delete(i) : next.add(i))
                    setImportSelected(next)
                  }}
                >
                  <CheckSquare className="mr-1 size-3" />
                  {filteredImportPreview.every(r => importSelected.has(r._idx)) ? "Hapus Centang Semua" : "Centang Semua"}
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredSelectedCount}/{filteredImportPreview.length} tampil dipilih
                  {filteredImportPreview.length !== importPreview.length && ` · ${importSelected.size} total`}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-auto border rounded max-h-[45vh]">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="p-2 text-left">NIS</th>
                      <th className="p-2 text-left">Nama</th>
                      <th className="p-2 text-left">JK</th>
                      <th className="p-2 text-left">Agama</th>
                      <th className="p-2 text-left">Kelas</th>
                      <th className="p-2 text-left">Konsentrasi Keahlian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredImportPreview.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          Tidak ada data yang cocok
                        </td>
                      </tr>
                    ) : filteredImportPreview.map((row) => (
                      <tr key={row._idx} className="border-t hover:bg-muted/50">
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={importSelected.has(row._idx)}
                            onCheckedChange={(checked) => {
                              const next = new Set(importSelected)
                              checked ? next.add(row._idx) : next.delete(row._idx)
                              setImportSelected(next)
                            }}
                          />
                        </td>
                        <td className="p-2">{row.nis}</td>
                        <td className="p-2">{row.nama_siswa}</td>
                        <td className="p-2">{row.jk}</td>
                        <td className="p-2">{row.agama || "Islam"}</td>
                        <td className="p-2">{row.kelas}</td>
                        <td className="p-2">{row.jurusan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-muted-foreground">
                  Format: <code>nis,nama_siswa,jk,agama,tingkatan,jurusan,part</code>
                </div>
                <Button onClick={executeImport} disabled={isImporting || importSelected.size === 0}>
                  {isImporting ? <Spinner className="mr-2 size-4" /> : <Upload className="mr-2 size-4" />}
                  Import {importSelected.size} Siswa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
