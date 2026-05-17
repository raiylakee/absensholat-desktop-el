import { useState, useEffect, useRef } from "react"
import { Search, Plus, Pencil, Trash2, UserCheck, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData } from "@/lib/api-utils"

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

  // Guru list state
  const [guruList, setGuruList] = useState<GuruResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [hasWaliFilter, setHasWaliFilter] = useState<"" | "true" | "false">("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Wali kelas list state
  const [waliList, setWaliList] = useState<WaliKelasListItem[]>([])
  const [isLoadingWali, setIsLoadingWali] = useState(false)

  // Classes for assign dialog
  const [kelasList, setKelasList] = useState<KelasOption[]>([])

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [removeWaliOpen, setRemoveWaliOpen] = useState(false)

  const [selectedGuru, setSelectedGuru] = useState<GuruResponse | null>(null)

  // Form state
  const [formNama, setFormNama] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formNip, setFormNip] = useState("")
  const [formKelas, setFormKelas] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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
      notify(err.message || "Gagal mengambil data guru", "error")
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
      notify(err.message || "Gagal mengambil data wali kelas", "error")
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

  const handleSearch = () => {
    setPage(1)
    fetchGuru(1)
  }

  const handleFilterChange = (val: "" | "true" | "false") => {
    setHasWaliFilter(val)
    setPage(1)
    setTimeout(() => fetchGuru(1), 0)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    fetchGuru(p)
  }

  // Create
  const openCreate = () => {
    setFormNama(""); setFormEmail(""); setFormPassword(""); setFormNip("")
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!formNama || !formEmail || !formPassword) { notify("Nama, email, dan password wajib diisi", "error"); return }
    setIsSaving(true)
    try {
      await window.electronAPI.createGuru({ body: { nama: formNama, email: formEmail, password: formPassword, nip: formNip || undefined } })
      notify("Guru berhasil ditambahkan", "success")
      setCreateOpen(false)
      fetchGuru(1)
    } catch (err: any) { notify(err.message || "Gagal menambahkan guru", "error") }
    finally { setIsSaving(false) }
  }

  // Edit
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
    } catch (err: any) { notify(err.message || "Gagal memperbarui guru", "error") }
    finally { setIsSaving(false) }
  }

  // Delete
  const openDelete = (guru: GuruResponse) => { setSelectedGuru(guru); setDeleteOpen(true) }

  const handleDelete = async () => {
    if (!selectedGuru) return
    setIsSaving(true)
    try {
      await window.electronAPI.deleteGuru({ id: selectedGuru.id_staff })
      notify("Guru berhasil dihapus", "success")
      setDeleteOpen(false)
      fetchGuru(1)
    } catch (err: any) { notify(err.message || "Gagal menghapus guru", "error") }
    finally { setIsSaving(false) }
  }

  // Assign wali kelas
  const openAssign = (guru: GuruResponse) => {
    setSelectedGuru(guru)
    setFormKelas(guru.id_kelas_wali?.toString() || "")
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedGuru || !formKelas) { notify("Pilih kelas terlebih dahulu", "error"); return }
    setIsSaving(true)
    try {
      await window.electronAPI.assignGuruWaliKelas({ id: selectedGuru.id_staff, body: { id_kelas: parseInt(formKelas) } })
      notify("Wali kelas berhasil ditetapkan", "success")
      setAssignOpen(false)
      fetchGuru(page)
    } catch (err: any) { notify(err.message || "Gagal menetapkan wali kelas", "error") }
    finally { setIsSaving(false) }
  }

  // Remove wali kelas
  const openRemoveWali = (guru: GuruResponse) => { setSelectedGuru(guru); setRemoveWaliOpen(true) }

  const handleRemoveWali = async () => {
    if (!selectedGuru) return
    setIsSaving(true)
    try {
      await window.electronAPI.removeGuruWaliKelas({ id: selectedGuru.id_staff })
      notify("Wali kelas berhasil dilepas", "success")
      setRemoveWaliOpen(false)
      fetchGuru(page)
    } catch (err: any) { notify(err.message || "Gagal melepas wali kelas", "error") }
    finally { setIsSaving(false) }
  }

  // Remove wali from wali tab
  const handleRemoveWaliFromList = async (item: WaliKelasListItem) => {
    try {
      await window.electronAPI.removeGuruWaliKelas({ id: item.id_staff })
      notify("Wali kelas berhasil dilepas", "success")
      fetchWali()
    } catch (err: any) { notify(err.message || "Gagal melepas wali kelas", "error") }
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
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Select value={hasWaliFilter} onValueChange={(v) => handleFilterChange(v as "" | "true" | "false")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Wali Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua</SelectItem>
                <SelectItem value="true">Sudah Jadi Wali</SelectItem>
                <SelectItem value="false">Belum Jadi Wali</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>Cari</Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" /> Tambah Guru
            </Button>
          </div>

          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Nama</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">NIP</th>
                      <th className="px-4 py-3 text-left font-medium">Wali Kelas</th>
                      <th className="px-4 py-3 text-left font-medium w-40">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guruList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Tidak ada data guru.
                        </td>
                      </tr>
                    ) : (
                      guruList.map((guru) => (
                        <tr key={guru.id_staff} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{guru.nama}</td>
                          <td className="px-4 py-3 text-muted-foreground">{guru.email}</td>
                          <td className="px-4 py-3">{guru.nip || "-"}</td>
                          <td className="px-4 py-3">
                            {guru.label_kelas ? (
                              <Badge variant="secondary">{guru.label_kelas}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(guru)}>
                                <Pencil className="size-4" />
                              </Button>
                              {guru.id_kelas_wali ? (
                                <Button variant="ghost" size="icon" title="Lepas Wali Kelas" onClick={() => openRemoveWali(guru)}>
                                  <UserMinus className="size-4 text-yellow-600" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" title="Tetapkan Wali Kelas" onClick={() => openAssign(guru)}>
                                  <UserCheck className="size-4 text-green-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="Hapus" onClick={() => openDelete(guru)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
          ) : (
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Kelas</th>
                      <th className="px-4 py-3 text-left font-medium">Nama Guru</th>
                      <th className="px-4 py-3 text-left font-medium">NIP</th>
                      <th className="px-4 py-3 text-left font-medium">Berlaku Mulai</th>
                      <th className="px-4 py-3 text-left font-medium w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waliList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Belum ada wali kelas aktif.
                        </td>
                      </tr>
                    ) : (
                      waliList.map((item) => (
                        <tr key={item.id_wali} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{item.kelas_label}</td>
                          <td className="px-4 py-3">{item.nama_guru}</td>
                          <td className="px-4 py-3">{item.nip || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.berlaku_mulai ? new Date(item.berlaku_mulai).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveWaliFromList(item)}
                            >
                              Lepas
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
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
            <DialogTitle>Edit Guru</DialogTitle>
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
              <Select value={formKelas} onValueChange={setFormKelas}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas..." />
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
