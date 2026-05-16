import { useState, useMemo, useEffect, useRef } from "react"
import { Search, ChevronDown, ChevronUp, Users, UserCog, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData } from "@/lib/api-utils"
import { AttendanceHistoryPanel } from "./AttendanceHistoryPanel"

interface ClassManagementItem {
  id_kelas: number
  id_staff_wali: number | null
  jurusan: string
  label: string
  part: string
  siswa_count: number
  tingkatan: number
  wali_kelas: string | null
}

interface TeacherLookupItem {
  id_staff: number
  nama: string
  nip: string
}

export function KelolaKelasSection() {
  const [classes, setClasses] = useState<ClassManagementItem[]>([])
  const [teachers, setTeachers] = useState<TeacherLookupItem[]>([])
  const [classDetails, setClassDetails] = useState<Record<number, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState<Record<number, boolean>>({})
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJurusanFilters, setSelectedJurusanFilters] = useState<string[]>([])
  const [expandedClass, setExpandedClass] = useState<number | null>(null)
  
  const [pendingWaliKelas, setPendingWaliKelas] = useState<Record<number, number>>({})
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({})
  
  const [selectedStudent, setSelectedStudent] = useState<{ nis: string; name: string } | null>(null)
  const isMounted = useRef(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [classesRes, teachersRes]: [any, any] = await Promise.all([
        window.electronAPI.getManagementClasses(),
        window.electronAPI.getStaffGuruLookup()
      ])
      
      if (!isMounted.current) return
      setClasses(extractData(classesRes))
      setTeachers(extractData(teachersRes))
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil data:", error)
      notify("Gagal mengambil data dari server", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const fetchClassDetails = async (id_kelas: number) => {
    if (classDetails[id_kelas]) return // Already fetched
    
    setIsLoadingDetails(prev => ({ ...prev, [id_kelas]: true }))
    try {
      const response: any = await window.electronAPI.getManagementClassDetails({ id: id_kelas })
      const data = extractData<any>(response);
      if (data) {
        setClassDetails(prev => ({ ...prev, [id_kelas]: (data as any).students || data || [] }))
      }
    } catch (error) {
      console.error("Gagal mengambil detail kelas:", error)
      notify("Gagal mengambil daftar siswa", "error")
    } finally {
      setIsLoadingDetails(prev => ({ ...prev, [id_kelas]: false }))
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchData()
    return () => { isMounted.current = false }
  }, [])

  const handleSetWaliKelas = (id_kelas: number, id_staff: number) => {
    setPendingWaliKelas(prev => ({ ...prev, [id_kelas]: id_staff }))
  }

  const handleSaveWaliKelas = async (id_kelas: number) => {
    const id_staff = pendingWaliKelas[id_kelas]
    if (!id_staff) return

    setIsSaving(prev => ({ ...prev, [id_kelas]: true }))
    try {
      await window.electronAPI.updateClassHomeroom({ id: id_kelas, body: { id_staff } })
      notify("Wali kelas berhasil diperbarui", "success")
      
      // Update local state
      const teacher = teachers.find(t => t.id_staff === id_staff)
      setClasses(prev => prev.map(c => 
        c.id_kelas === id_kelas 
          ? { ...c, id_staff_wali: id_staff, wali_kelas: teacher?.nama || null } 
          : c
      ))
      
      setPendingWaliKelas(prev => {
        const next = { ...prev }
        delete next[id_kelas]
        return next
      })
    } catch (error: any) {
      const errMsg = typeof error === "string" ? error : ""
      if (errMsg.includes("sudah") || errMsg.includes("409") || errMsg.includes("conflict")) {
        notify("Staff ini sudah menjadi wali kelas aktif di kelas lain", "error")
      } else {
        notify("Gagal memperbarui wali kelas: " + errMsg, "error")
      }
    } finally {
      setIsSaving(prev => ({ ...prev, [id_kelas]: false }))
    }
  }

  const handleCancelWaliKelas = (id_kelas: number) => {
    setPendingWaliKelas(prev => {
      const next = { ...prev }
      delete next[id_kelas]
      return next
    })
  }

  // Derived state
  const majorOptions = useMemo(() => {
    const majors = new Set<string>()
    classes.forEach(c => majors.add(c.jurusan))
    return Array.from(majors).sort()
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = c.label.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesJurusan = selectedJurusanFilters.length === 0 || selectedJurusanFilters.includes(c.jurusan)
      return matchesSearch && matchesJurusan
    })
  }, [classes, searchQuery, selectedJurusanFilters])

  const classesByMajor = useMemo(() => {
    const result: Record<string, ClassManagementItem[]> = {}
    filteredClasses.forEach(c => {
      if (!result[c.jurusan]) result[c.jurusan] = []
      result[c.jurusan].push(c)
    })
    return result
  }, [filteredClasses])

  const toggleExpand = (id_kelas: number) => {
    if (expandedClass === id_kelas) {
      setExpandedClass(null)
    } else {
      setExpandedClass(id_kelas)
      fetchClassDetails(id_kelas)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kelola Kelas</CardTitle>
            <CardDescription className="mt-1">Manajemen wali kelas dan daftar siswa per kelas.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari kelas..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    <Filter className="mr-2 size-4" />
                    Jurusan
                  </Button>
                }
              />
              <DropdownMenuContent className="w-56">
                 {majorOptions.map((major) => (
                    <DropdownMenuCheckboxItem
                      key={`filter-major-${major}`}
                      checked={selectedJurusanFilters.includes(major)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedJurusanFilters((prev) =>
                          checked ? [...prev, major] : prev.filter((item) => item !== major)
                        )
                      }
                    >
                      {major}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-8">
        {Object.keys(classesByMajor).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCog className="size-12 mx-auto mb-4 opacity-20" />
            <p>Tidak ada kelas yang cocok dengan filter pencarian.</p>
          </div>
        ) : (
          Object.keys(classesByMajor).sort().map(major => (
            <div key={major} className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <h2 className="text-lg font-bold text-primary">{major}</h2>
                <Badge variant="secondary" className="font-normal">{classesByMajor[major].length} Kelas</Badge>
              </div>
              
              <div className="space-y-3">
                {classesByMajor[major].map(kelas => {
                  const isExpanded = expandedClass === kelas.id_kelas
                  const students = classDetails[kelas.id_kelas] || []
                  const isPending = pendingWaliKelas[kelas.id_kelas] !== undefined
                  const currentStaffId = isPending ? pendingWaliKelas[kelas.id_kelas] : kelas.id_staff_wali
                  const currentWaliName = isPending 
                    ? teachers.find(t => t.id_staff === pendingWaliKelas[kelas.id_kelas])?.nama 
                    : kelas.wali_kelas

                  return (
                    <Card key={kelas.id_kelas} className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'hover:border-primary/30'}`}>
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer bg-card hover:bg-muted/30 select-none"
                        onClick={() => toggleExpand(kelas.id_kelas)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-base sm:text-lg w-24 sm:w-32">{kelas.label}</span>
                          <Badge variant="outline" className="bg-primary/5 hidden sm:inline-flex">
                            <Users className="mr-1 size-3" /> {kelas.siswa_count} Siswa
                          </Badge>
                          {isPending && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 animate-pulse">
                              Unsaved Changes
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">Wali Kelas</span>
                            <span className={`text-sm font-medium ${!currentWaliName && 'text-yellow-600'}`}>
                              {currentWaliName || "Belum Diatur"}
                            </span>
                          </div>
                          <div className="p-1 rounded-full bg-muted/50 text-muted-foreground">
                            {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/10 p-4 sm:p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-background p-4 rounded-lg border shadow-sm">
                            <div className="flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary">
                              <UserCog className="size-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-sm font-medium leading-none">
                                Wali Kelas
                              </label>
                              <p className="text-xs text-muted-foreground">Pilih guru yang bertanggung jawab atas kelas ini.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-[250px]">
                                <Select 
                                  value={currentStaffId?.toString() || ""} 
                                  onValueChange={(val) => val !== null && handleSetWaliKelas(kelas.id_kelas, parseInt(val))}
                                >
                                  <SelectTrigger className={isPending ? "border-yellow-500 ring-yellow-500/20" : ""}>
                                    <SelectValue placeholder="Pilih Guru...">
                                      {currentStaffId
                                        ? teachers.find(t => t.id_staff === currentStaffId)?.nama || "Pilih Guru..."
                                        : "Pilih Guru..."}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teachers.map(t => (
                                      <SelectItem key={t.id_staff} value={t.id_staff.toString()}>
                                        {t.nama} {t.nip ? `(${t.nip})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {isPending && (
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleSaveWaliKelas(kelas.id_kelas)}
                                    disabled={isSaving[kelas.id_kelas]}
                                  >
                                    {isSaving[kelas.id_kelas] ? <Spinner className="size-3 mr-1" /> : null}
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleCancelWaliKelas(kelas.id_kelas)}>
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">Daftar Siswa ({kelas.siswa_count})</h3>
                            </div>
                            
                            <div className="rounded-md border bg-background overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50 border-b">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-medium w-16">No</th>
                                      <th className="px-4 py-3 text-left font-medium w-32">NIS</th>
                                      <th className="px-4 py-3 text-left font-medium">Nama Siswa</th>
                                      <th className="px-4 py-3 text-left font-medium w-32">Jenis Kelamin</th>
                                      <th className="px-4 py-3 text-left font-medium w-24">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {isLoadingDetails[kelas.id_kelas] ? (
                                      <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center">
                                          <Spinner className="mx-auto" />
                                        </td>
                                      </tr>
                                    ) : students.length > 0 ? (
                                      students.map((student: any, index: number) => (
                                        <tr key={student.nis} className="border-b last:border-0 hover:bg-muted/30">
                                          <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                                          <td className="px-4 py-3 font-medium">{student.nis}</td>
                                          <td className="px-4 py-3">{student.nama_siswa}</td>
                                          <td className="px-4 py-3">{student.jk === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
                                          <td className="px-4 py-3">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedStudent({ nis: student.nis, name: student.nama_siswa })
                                              }}
                                            >
                                              Detail
                                            </Button>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                          Belum ada siswa di kelas ini.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <AttendanceHistoryPanel
        nis={selectedStudent?.nis ?? ""}
        studentName={selectedStudent?.name ?? ""}
        open={selectedStudent !== null}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}
