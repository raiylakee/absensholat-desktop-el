import { useState, useEffect, useRef } from "react"
import { Search, Plus, Pencil, Trash2, UserCheck, UserMinus, Download, Loader2, Mail, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData, handleApiError } from "@/lib/api-utils"
import { useDownloadAction } from "@/hooks/use-download-action"
import { arrayToCsv } from "@/lib/export-filename"

interface GuruResponse {
  id_staff: number
  id_account: number
  nama: string
  nip: string | null
  email: string
  wali_kelas: string | null
  id_kelas_wali: number | null
  label_kelas: string | null
  berlaku_mulai: string | null
}

interface WaliKelasListItem {
  id_wali: number
  id_kelas: number
  kelas_label: string
  tingkatan: number
  jurusan: string
  part: string
  id_staff: number
  nama_guru: string
  nip: string | null
  berlaku_mulai: string
  is_active: boolean
}

interface KelasOption {
  id_kelas: number
  label: string
}

const ITEMS_PER_PAGE = 15

export function KelolaGuruSection() {
  const [activeTab, setActiveTab] = useState<"guru" | "wali">("guru")

  const [guruList, setGuruList] = useState<GuruResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [hasWaliFilter, setHasWaliFilter] = useState<"" | "true" | "false">("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [waliList, setWaliList] = useState<WaliKelasListItem[]>([])
  const [isLoadingWali, setIsLoadingWali] = useState(false)

  const [kelasList, setKelasList] = useState<KelasOption[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [removeWaliOpen, setRemoveWaliOpen] = useState(false)

  const [selectedGuru, setSelectedGuru] = useState<GuruResponse | null>(null)

  const [formNama, setFormNama] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formNip, setFormNip] = useState("")
  const [formKelas, setFormKelas] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const { isDownloading, download } = useDownloadAction()

  const isMounted = useRef(true)

  const fetchGuru = async (p = page) => {
    setIsLoading(true)
    try {
      const res = await window.electronAPI.getGuruList({
        page: p,
        limit: ITEMS_PER_PAGE,
        search: search || undefined,
        has_wali_kelas: hasWaliFilter || undefined,
      })
      if (!isMounted.current) return
      const data = extractData<GuruResponse[]>(res)
      setGuruList(Array.isArray(data) ? data : [])
      const meta = res?.meta || res?.data?.meta
      if (meta?.total_pages) setTotalPages(meta.total_pages)
      else if (meta?.total && meta?.limit) setTotalPages(Math.ceil(meta.total / meta.limit))
    } catch (err: any) {
      if (!isMounted.current) return
      notify(handleApiError(err) || "Gagal mengambil data guru", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const fetchWali = async () => {
    setIsLoadingWali(true)
    try {
      const res = await window.electronAPI.getWaliKelasList({ limit: 100 })
      if (!isMounted.current) return
      const data = extractData<WaliKelasListItem[]>(res)
      setWaliList(Array.isArray(data) ? data : [])
    } catch (err: any) {
      if (!isMounted.current) return
      notify(handleApiError(err) || "Gagal mengambil data wali kelas", "error")
    } finally {
      if (isMounted.current) setIsLoadingWali(false)
    }
  }

  const fetchKelas = async () => {
    try {
      const res = await window.electronAPI.getManagementClasses()
      const data = extractData<any[]>(res)
      if (Array.isArray(data)) {
        setKelasList(data.map((k: any) => ({ id_kelas: k.id_kelas, label: k.label })))
      }
    } catch {}
  }

  useEffect(() => {
    isMounted.current = true
    fetchGuru(1)
    fetchKelas()
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    if (activeTab === "wali") fetchWali()
  }, [activeTab])

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchGuru(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleFilterChange = (val: "" | "true" | "false") => {
    setHasWaliFilter(val)
    setPage(1)
    setTimeout(() => fetchGuru(1), 0)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    fetchGuru(p)
  }

  const openCreate = () => {
    setFormNama(""); setFormEmail(""); setFormPassword(""); setFormNip("")
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!formNama || !formEmail || !formPassword) { notify("Nama, email, dan kata sandi wajib diisi", "error"); return }
    setIsSaving(true)
    try {
      await window.electronAPI.createGuru({ body: { nama: formNama, email: formEmail, password: formPassword, nip: formNip || undefined } })
      notify("Guru berhasil ditambahkan", "success")
      setCreateOpen(false)
      fetchGuru(1)
    } catch (err: any) { notify(handleApiError(err) || "Gagal menambahkan guru", "error") }
    finally { setIsSaving(false) }
  }

  const openEdit = (guru: GuruResponse) => {
    setSelectedGuru(guru)
    setFormNama(guru.nama)
    setFormEmail(guru.email)
    setFormNip(guru.nip || "")
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selectedGuru) return
    if (!formNama || !formEmail) { notify("Nama dan email wajib diisi", "error"); return }
    setIsSaving(true)
    try {
      await window.electronAPI.updateGuru({ id: selectedGuru.id_staff, body: { nama: formNama, email: formEmail, nip: formNip || undefined } })
      notify("Data guru berhasil diperbarui", "success")
      setEditOpen(false)
      fetchGuru(page)
    } catch (err: any) { notify(handleApiError(err) || "Gagal memperbarui guru", "error") }
    finally { setIsSaving(false) }
  }

  const openDelete = (guru: GuruResponse) => { setSelectedGuru(guru); setDeleteOpen(true) }

  const handleDelete = async () => {
    if (!selectedGuru) return
    setIsSaving(true)
    try {
      await window.electronAPI.deleteGuru({ id: selectedGuru.id_staff })
      notify("Guru berhasil dihapus", "success")
      setDeleteOpen(false)
      fetchGuru(1)
    } catch (err: any) { notify(handleApiError(err) || "Gagal menghapus guru", "error") }
    finally { setIsSaving(false) }
  }

  const openAssign = (guru: GuruResponse) => {
    setSelectedGuru(guru)
    setFormKelas(guru.id_kelas_wali?.toString() || "")
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedGuru || !formKelas) { notify("Pilih kelas terlebih dahulu", "error"); return }
    const kelasId = parseInt(formKelas)
    if (isNaN(kelasId)) { notify("ID kelas tidak valid", "error"); return }
    setIsSaving(true)
    try {
      await window.electronAPI.assignGuruWaliKelas({ id: selectedGuru.id_staff, body: { id_kelas: kelasId } })
      notify("Wali kelas berhasil ditetapkan", "success")
      setAssignOpen(false)
      fetchGuru(page)
    } catch (err: any) { notify(handleApiError(err) || "Gagal menetapkan wali kelas", "error") }
    finally { setIsSaving(false) }
  }

  const openRemoveWali = (guru: GuruResponse) => { setSelectedGuru(guru); setRemoveWaliOpen(true) }

  const handleRemoveWali = async () => {
    if (!selectedGuru) return
    setIsSaving(true)
    try {
      await window.electronAPI.removeGuruWaliKelas({ id: selectedGuru.id_staff })
      notify("Wali kelas berhasil dilepas", "success")
      setRemoveWaliOpen(false)
      fetchGuru(page)
    } catch (err: any) { notify(handleApiError(err) || "Gagal melepas wali kelas", "error") }
    finally { setIsSaving(false) }
  }

  const handleRemoveWaliFromList = async (item: WaliKelasListItem) => {
    try {
      await window.electronAPI.removeGuruWaliKelas({ id: item.id_staff })
      notify("Wali kelas berhasil dilepas", "success")
      fetchWali()
    } catch (err: any) { notify(handleApiError(err) || "Gagal melepas wali kelas", "error") }
  }

  const handleDownload = () => {
    if (guruList.length === 0) {
      notify("Tidak ada data untuk diunduh", "info")
      return
    }
    download({
      filenameOptions: {
        dataType: "daftar-guru",
        format: "csv",
      },
      fetchData: async () => {
        const headers = ["Nama", "Email", "NIP", "Wali Kelas"]
        const rows = guruList.map((guru) => [
          guru.nama,
          guru.email,
          guru.nip ?? "",
          guru.label_kelas ?? "",
        ])
        const csv = arrayToCsv(headers, rows)
        return { data: btoa(unescape(encodeURIComponent(csv))), encoding: "base64" as const }
      },
      dialogFilters: [{ name: "CSV Files", extensions: ["csv"] }],
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kelola Guru</CardTitle>
            <CardDescription className="mt-1">Manajemen data guru dan penugasan wali kelas.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "guru" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("guru")}
            >
              Daftar Guru
            </Button>
            <Button
              variant={activeTab === "wali" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("wali")}
            >
              Wali Kelas Aktif
            </Button>
            {activeTab === "guru" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isDownloading || isLoading}
                      aria-label="Unduh Daftar"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      <span className="ml-2">Unduh Daftar</span>
                    </Button>
                  </TooltipTrigger>
                  {(isDownloading || isLoading) && (
                    <TooltipContent>
                      {isDownloading ? "Sedang mengunduh..." : "Memuat data..."}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      </Card>

      {activeTab === "guru" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={hasWaliFilter} onValueChange={(v) => handleFilterChange(v as "" | "true" | "false")}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Filter Wali Kelas">
                  {hasWaliFilter === "true" ? "Sudah Jadi Wali" : hasWaliFilter === "false" ? "Belum Jadi Wali" : "Semua"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua</SelectItem>
                <SelectItem value="true">Sudah Jadi Wali</SelectItem>
                <SelectItem value="false">Belum Jadi Wali</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Tambah Guru
            </Button>
          </div>

          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : guruList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Tidak ada data guru.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guruList.map((guru) => (
                <Card key={guru.id_staff} className="overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {guru.nama.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{guru.nama}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{guru.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {guru.nip && (
                        <Badge variant="outline" className="text-xs font-normal">
                          <CreditCard className="mr-1 size-3" />
                          {guru.nip}
                        </Badge>
                      )}
                      {guru.label_kelas ? (
                        <Badge variant="secondary" className="text-xs">
                          Wali {guru.label_kelas}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                          Belum jadi wali
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 pt-1 border-t">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => openEdit(guru)}>
                        <Pencil className="mr-1 size-3" /> Ubah
                      </Button>
                      {guru.id_kelas_wali ? (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-yellow-600" onClick={() => openRemoveWali(guru)}>
                          <UserMinus className="mr-1 size-3" /> Lepas Wali
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-green-600" onClick={() => openAssign(guru)}>
                          <UserCheck className="mr-1 size-3" /> Tetapkan Wali
                        </Button>
                      )}
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(guru)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">Halaman {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "wali" && (
        <div className="space-y-4">
          {isLoadingWali ? (
            <div className="flex h-[300px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : waliList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Belum ada wali kelas aktif.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {waliList.map((item) => (
                <Card key={item.id_wali} className="overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {item.nama_guru.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{item.nama_guru}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate text-muted-foreground">Wali Kelas</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {item.kelas_label}
                      </Badge>
                      {item.nip && (
                        <Badge variant="outline" className="text-xs font-normal">
                          <CreditCard className="mr-1 size-3" />
                          {item.nip}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-xs text-muted-foreground">
                        Sejak {item.berlaku_mulai ? new Date(item.berlaku_mulai).toLocaleDateString("id-ID") : "-"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRemoveWaliFromList(item)}
                      >
                        Lepas
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Guru</DialogTitle>
            <DialogDescription>Isi data guru baru.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={formNama} onChange={(e) => setFormNama(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="grid gap-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@sekolah.sch.id" />
            </div>
            <div className="grid gap-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <PasswordInput value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>NIP</Label>
              <Input value={formNip} onChange={(e) => setFormNip(e.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Data Guru</DialogTitle>
            <DialogDescription>Perbarui data guru.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={formNama} onChange={(e) => setFormNama(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>NIP</Label>
              <Input value={formNip} onChange={(e) => setFormNip(e.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Wali Kelas Dialog */}
      <Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tetapkan Wali Kelas</DialogTitle>
            <DialogDescription>Pilih kelas untuk {selectedGuru?.nama}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kelas <span className="text-destructive">*</span></Label>
              <Select value={formKelas} onValueChange={(v) => setFormKelas(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas...">
                    {formKelas ? kelasList.find(k => k.id_kelas.toString() === formKelas)?.label || "Pilih kelas..." : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {kelasList.map((k) => (
                    <SelectItem key={k.id_kelas} value={k.id_kelas.toString()}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Batal</Button>
            <Button onClick={handleAssign} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Tetapkan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Guru</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <strong>{selectedGuru?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>{isSaving ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Wali Kelas Confirm Dialog */}
      <Dialog open={removeWaliOpen} onOpenChange={(o) => { setRemoveWaliOpen(o) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Lepas Wali Kelas</DialogTitle>
            <DialogDescription>
              Yakin ingin melepas <strong>{selectedGuru?.nama}</strong> dari wali kelas <strong>{selectedGuru?.label_kelas}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveWaliOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleRemoveWali} disabled={isSaving}>{isSaving ? "Memproses..." : "Lepas"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
