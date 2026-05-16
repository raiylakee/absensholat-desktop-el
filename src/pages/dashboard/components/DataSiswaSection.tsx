import { useMemo, useState, useEffect, useRef } from "react"
import { Eye, Filter, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GENDER_OPTIONS } from "@/pages/dashboard/constants"
import type { Student } from "@/pages/dashboard/types"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData, extractPagination, normalizeStudent, genderToApi } from "@/lib/api-utils"
import { Combobox } from "@/components/ui/combobox"

interface DataSiswaSectionProps {
  forcedClass?: string
}

export function DataSiswaSection({ forcedClass }: DataSiswaSectionProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJurusanFilters, setSelectedJurusanFilters] = useState<string[]>([])
  const [selectedKelasFilters, setSelectedKelasFilters] = useState<string[]>([])
  const [selectedGenderFilters, setSelectedGenderFilters] = useState<Student["jenisKelamin"][]>([])
  const [selectedAgamaFilter, setSelectedAgamaFilter] = useState<string>("")
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [addingStudent, setAddingStudent] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 50
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
  
  const [dynamicMajorOptions, setDynamicMajorOptions] = useState<any[]>([])
  const [dynamicClassOptions, setDynamicClassOptions] = useState<any[]>([])
  const [dynamicYearOptions, setDynamicYearOptions] = useState<any[]>([])
  const isMounted = useRef(true)

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const response: any = await window.electronAPI.getStudents({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        jurusan: selectedJurusanFilters.length > 0 ? selectedJurusanFilters[0] : undefined,
        jk: selectedGenderFilters.length > 0 ? genderToApi(selectedGenderFilters[0]) : undefined,
        agama: selectedAgamaFilter || undefined,
      })
      if (!isMounted.current) return
      const data = extractData(response);
      const mapped: Student[] = Array.isArray(data) ? data.map(normalizeStudent) : [];
      setStudents(mapped)
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
        window.electronAPI.getAcademicYears()
      ])
      if (!isMounted.current) return
      const majors = extractData(majorsRes);
      const classes = extractData(classesRes);
      const years = extractData(yearsRes);
      if (Array.isArray(majors)) setDynamicMajorOptions(majors)
      if (Array.isArray(classes)) setDynamicClassOptions(classes)
      if (Array.isArray(years)) setDynamicYearOptions(years)
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil filter:", error)
      notify("Gagal mengambil data filter", "error")
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchFilters()
    return () => { isMounted.current = false }
  }, [])

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
  }, [searchQuery, selectedJurusanFilters, selectedGenderFilters, selectedAgamaFilter])

  const classOptionsForFilter = useMemo(
    () => dynamicClassOptions.map((k: any) => k.label as string).filter(Boolean),
    [dynamicClassOptions]
  )

  // Apply kelas filter client-side since API doesn't support it
  const filteredStudents = useMemo(() => {
    if (selectedKelasFilters.length === 0) return students
    return students.filter(s => selectedKelasFilters.includes(s.kelas))
  }, [students, selectedKelasFilters])

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

  const saveStudentDraft = async () => {
    const draft = { ...studentDraft, nis: studentDraft.nis.trim(), nama: studentDraft.nama.trim() }
    if (!draft.nis || !draft.nama) {
      notify("NIS dan Nama harus diisi", "error")
      return
    }

    setIsSaving(true)
    try {
      if (addingStudent) {
        await window.electronAPI.createStudent({
          body: {
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
        })
        notify("Siswa berhasil ditambahkan", "success")
      } else if (editingStudent) {
        await window.electronAPI.updateStudent({
          nis: editingStudent.nis,
          body: {
            nama_siswa: draft.nama,
            jk: genderToApi(draft.jk),
            agama: draft.agama || "Islam",
            id_jurusan: draft.id_jurusan,
            id_kelas: draft.id_kelas,
            id_tahun_masuk: draft.id_tahun_masuk,
            class_status: draft.class_status || "active",
            status_akademik: draft.status_akademik || "AKTIF"
          }
        })
        notify("Data siswa berhasil diperbarui", "success")
      }

      await fetchStudents()
      setAddingStudent(false)
      setEditingStudent(null)
    } catch (error) {
      notify("Gagal menyimpan data siswa: " + error, "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Data Siswa</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari siswa..."
              className="w-[220px]"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {!forcedClass && (
              <>
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
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jurusan</p>
                    {dynamicMajorOptions.map((major) => {
                      const label = typeof major === 'string' ? major : major.nama_jurusan
                      return (
                        <DropdownMenuCheckboxItem
                          key={`filter-major-${label}`}
                          checked={selectedJurusanFilters.includes(label)}
                          onSelect={(event) => event.preventDefault()}
                          onCheckedChange={(checked) =>
                            setSelectedJurusanFilters((prev) =>
                              checked ? [...prev, label] : prev.filter((item) => item !== label)
                            )
                          }
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Kelas</p>
                    {classOptionsForFilter.map((kelas) => (
                      <DropdownMenuCheckboxItem
                        key={`filter-class-${kelas}`}
                        checked={selectedKelasFilters.includes(kelas)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          setSelectedKelasFilters((prev) =>
                            checked ? [...prev, kelas] : prev.filter((item) => item !== kelas)
                          )
                        }
                      >
                        {kelas}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jenis Kelamin</p>
                    {GENDER_OPTIONS.map((gender) => (
                      <DropdownMenuCheckboxItem
                        key={`filter-gender-${gender}`}
                        checked={selectedGenderFilters.includes(gender)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          setSelectedGenderFilters((prev) =>
                            checked ? [...prev, gender] : prev.filter((item) => item !== gender)
                          )
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
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>No</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Agama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Keterangan</TableHead>
                  {!forcedClass && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={forcedClass ? 6 : 7} className="py-8 text-center">
                      <Spinner className="mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={forcedClass ? 6 : 7} className="py-8 text-center text-muted-foreground">
                      Tidak ada data siswa ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.nis}>
                      <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="font-medium">{student.nis}</TableCell>
                      <TableCell>{student.nama}</TableCell>
                      <TableCell>{(student as any).agama || "Islam"}</TableCell>
                      <TableCell>{student.kelas}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setDetailStudent(student)}>
                          <Eye className="mr-2 size-4" />
                          Detail
                        </Button>
                      </TableCell>
                      {!forcedClass && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditStudentDialog(student)}>
                              <Pencil className="mr-2 size-4" />
                              Ubah
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingStudent(student)}>
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      )}
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

      <Dialog open={Boolean(detailStudent)} onOpenChange={(open) => !open && setDetailStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {detailStudent && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">NIS:</span> {detailStudent.nis}</p>
              <p><span className="text-muted-foreground">Nama:</span> {detailStudent.nama}</p>
              <p><span className="text-muted-foreground">Jurusan:</span> {detailStudent.jurusan}</p>
              <p><span className="text-muted-foreground">Kelas:</span> {detailStudent.kelas}</p>
              <p><span className="text-muted-foreground">Jenis Kelamin:</span> {detailStudent.jenisKelamin}</p>
              <p><span className="text-muted-foreground">Agama:</span> {(detailStudent as any).agama || "Islam"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingStudent) || addingStudent} onOpenChange={(open) => !open && (setEditingStudent(null), setAddingStudent(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addingStudent ? "Tambah Siswa" : "Edit Siswa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-nis">NIS</Label>
              <Input
                id="student-nis"
                value={studentDraft.nis}
                onChange={(event) => setStudentDraft((current: any) => ({ ...current, nis: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-nama">Nama</Label>
              <Input
                id="student-nama"
                value={studentDraft.nama}
                onChange={(event) => setStudentDraft((current: any) => ({ ...current, nama: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Jurusan</Label>
                <Combobox
                  options={dynamicMajorOptions.map((m: any) => ({ value: String(m.id_jurusan), label: m.nama_jurusan }))}
                  value={studentDraft.id_jurusan !== undefined ? String(studentDraft.id_jurusan) : ""}
                  onValueChange={(v) => {
                    const major = dynamicMajorOptions.find((m: any) => String(m.id_jurusan) === v)
                    if (major) setStudentDraft((current: any) => ({ ...current, id_jurusan: major.id_jurusan, jurusan: major.nama_jurusan }))
                  }}
                  placeholder="Pilih Jurusan"
                  searchPlaceholder="Cari jurusan..."
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
                    if (kelas) setStudentDraft((current: any) => ({ ...current, id_kelas: kelas.id_kelas, kelas: kelas.label }))
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
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((gender) => (
                      <SelectItem key={`student-gender-${gender}`} value={gender}>{gender}</SelectItem>
                    ))}
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => (setAddingStudent(false), setEditingStudent(null))} disabled={isSaving}>
                Batal
              </Button>
              <Button onClick={saveStudentDraft} disabled={isSaving}>
                {isSaving ? <Spinner size="sm" /> : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingStudent)} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Siswa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus siswa <strong>{deletingStudent?.nama}</strong> ({deletingStudent?.nis}). Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
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
              {isSaving ? <Spinner size="sm" /> : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
