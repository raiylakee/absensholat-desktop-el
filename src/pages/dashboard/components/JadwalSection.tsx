import { useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Clock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAJOR_OPTIONS, initialJadwalRows, initialPrayerCards } from "@/pages/dashboard/constants"
import type { JadwalRow, PrayerCard, JadwalCell } from "@/pages/dashboard/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData } from "@/lib/api-utils"

interface JadwalSectionProps {
  readOnly?: boolean
}

interface JurusanData {
  id_jurusan: number
  nama_jurusan: string
  hari_dhuha: string
}

interface JadwalSholatData {
  id_jadwal: number
  id_waktu: number
  hari: string
  jurusans?: JurusanData[]
  waktu_sholat?: {
    id_waktu: number
    id_jenis: number
    waktu_mulai: string
    waktu_selesai: string
    jenis_sholat?: { id_jenis: number; nama_jenis: string; butuh_giliran: boolean }
  }
}

export function JadwalSection({ readOnly = false }: JadwalSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rawSchedules, setRawSchedules] = useState<JadwalSholatData[]>([])
  const [allJurusan, setAllJurusan] = useState<JurusanData[]>([])
  const [savedJadwalRows, setSavedJadwalRows] = useState<JadwalRow[]>(initialJadwalRows)
  const [jadwalRows, setJadwalRows] = useState<JadwalRow[]>(initialJadwalRows)
  const [selectedJadwalCell, setSelectedJadwalCell] = useState<JadwalCell | null>(null)
  const [prayerCards, setPrayerCards] = useState<PrayerCard[]>(initialPrayerCards)
  const [editingPrayerIndex, setEditingPrayerIndex] = useState<number | null>(null)
  const [prayerDraft, setPrayerDraft] = useState<any | null>(null)

  // Create prayer type state
  const [createPrayerOpen, setCreatePrayerOpen] = useState(false)
  const [newPrayerName, setNewPrayerName] = useState("")
  const [newPrayerStart, setNewPrayerStart] = useState("06:00")
  const [newPrayerEnd, setNewPrayerEnd] = useState("07:00")
  const [isCreating, setIsCreating] = useState(false)

  const [dynamicMajorOptions, setDynamicMajorOptions] = useState<string[]>(MAJOR_OPTIONS)
  const isMounted = useRef(true)

  const fetchSchedules = async () => {
    setIsLoading(true)
    try {
      const [schedulesRes, dhuhaRes, majorsRes, timesRes, typesRes]: any = await Promise.all([
        window.electronAPI.getPrayerSchedules(),
        window.electronAPI.getDhuhaGroups(),
        window.electronAPI.getMajors(),
        window.electronAPI.getPrayerTimes(),
        window.electronAPI.getPrayerTypes(),
      ])
      if (!isMounted.current) return

      const schedules: JadwalSholatData[] = extractData(schedulesRes) ?? []
      const dhuhaSchedules: JurusanData[] = extractData(dhuhaRes) ?? []
      const majors: JurusanData[] = extractData(majorsRes) ?? []
      const prayerTimes: any[] = extractData(timesRes) ?? []
      const prayerTypes: any[] = extractData(typesRes) ?? []

      setRawSchedules(schedules)
      setAllJurusan(majors)
      setDynamicMajorOptions(majors.map(m => m.nama_jurusan))

      // Build lookup maps for prayer times and types
      const typeMap = new Map(prayerTypes.map(t => [t.id_jenis, t]))
      const timeMap = new Map(prayerTimes.map(t => [t.id_waktu, { ...t, jenis_sholat: typeMap.get(t.id_jenis) }]))

      // Enrich schedules with waktu_sholat data
      for (const s of schedules) {
        if (!s.waktu_sholat && s.id_waktu) {
          const time = timeMap.get(s.id_waktu)
          if (time) {
            s.waktu_sholat = {
              id_waktu: time.id_waktu,
              id_jenis: time.id_jenis,
              waktu_mulai: time.waktu_mulai,
              waktu_selesai: time.waktu_selesai,
              jenis_sholat: time.jenis_sholat ? {
                id_jenis: time.jenis_sholat.id_jenis,
                nama_jenis: time.jenis_sholat.nama_jenis,
                butuh_giliran: time.jenis_sholat.butuh_giliran,
              } : undefined,
            }
          }
        }
      }

      // Build dhuha rotation table from jurusan hari_dhuha
      const days = ["Senin", "Selasa", "Rabu", "Kamis"]
      const rows: JadwalRow[] = days.map(day => {
        const dayJurusans = dhuhaSchedules.filter(j => j.hari_dhuha === day)
        return {
          hari: day,
          jurusan1: dayJurusans[0]?.nama_jurusan || "-",
          jurusan2: dayJurusans[1]?.nama_jurusan || "-",
          id1: dayJurusans[0]?.id_jurusan,
          id2: dayJurusans[1]?.id_jurusan,
        }
      })
      setSavedJadwalRows(rows)
      setJadwalRows(rows)

      // Build prayer cards from schedules grouped by prayer type
      const prayerTypeCardMap = new Map<string, { waktuSholat: any; jurusans: Set<string>; idJadwal: number }>()
      for (const s of schedules) {
        const name = s.waktu_sholat?.jenis_sholat?.nama_jenis
        if (!name) continue
        if (!prayerTypeCardMap.has(name)) {
          prayerTypeCardMap.set(name, { waktuSholat: s.waktu_sholat, jurusans: new Set(), idJadwal: s.id_jadwal })
        }
        const entry = prayerTypeCardMap.get(name)!
        if (s.jurusans) {
          for (const j of s.jurusans) entry.jurusans.add(j.nama_jurusan)
        }
      }

      const cards: PrayerCard[] = Array.from(prayerTypeCardMap.entries()).map(([name, { waktuSholat, jurusans, idJadwal }]) => ({
        id: idJadwal,
        nama: name,
        waktuMulai: formatHHMM(waktuSholat.waktu_mulai),
        waktuSelesai: formatHHMM(waktuSholat.waktu_selesai),
        jurusan: Array.from(jurusans),
        kelas: [],
      }))

      setPrayerCards(cards.length > 0 ? cards : initialPrayerCards)
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil jadwal:", error)
      notify("Gagal memuat data jadwal", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchSchedules()
    return () => { isMounted.current = false }
  }, [])

  const hasJadwalChanges = useMemo(
    () => JSON.stringify(jadwalRows) !== JSON.stringify(savedJadwalRows),
    [jadwalRows, savedJadwalRows]
  )

  const formatJurusan = (majors: string[]) => {
    if (majors.length === 0) return "-"
    if (majors.length === dynamicMajorOptions.length) return "Semua Jurusan"
    return majors.join(", ")
  }

  const formatWaktuRange = (start: string, end: string) => `${start} - ${end} WIB`

  const handleSwapCellClick = (rowIndex: number, column: "jurusan1" | "jurusan2") => {
    if (!selectedJadwalCell) {
      setSelectedJadwalCell({ rowIndex, column })
      return
    }
    if (selectedJadwalCell.rowIndex === rowIndex && selectedJadwalCell.column === column) {
      setSelectedJadwalCell(null)
      return
    }
    setJadwalRows((previous) => {
      const next = previous.map((row) => ({ ...row }))
      const sourceValue = next[selectedJadwalCell.rowIndex][selectedJadwalCell.column]
      const targetValue = next[rowIndex][column]
      next[selectedJadwalCell.rowIndex][selectedJadwalCell.column] = targetValue
      next[rowIndex][column] = sourceValue
      return next
    })
    setSelectedJadwalCell(null)
  }

  const handleSaveWeeklyJadwal = async () => {
    setIsSaving(true)
    try {
      // Build rows: for each jurusan that appears in the table, set its hari_dhuha
      const rows: { id_jurusan: number; hari: string }[] = []
      for (const row of jadwalRows) {
        if (row.jurusan1 !== "-") {
          const j = allJurusan.find(m => m.nama_jurusan === row.jurusan1)
          if (j) rows.push({ id_jurusan: j.id_jurusan, hari: row.hari })
        }
        if (row.jurusan2 !== "-") {
          const j = allJurusan.find(m => m.nama_jurusan === row.jurusan2)
          if (j) rows.push({ id_jurusan: j.id_jurusan, hari: row.hari })
        }
      }

      if (rows.length === 0) {
        notify("Tidak ada jadwal valid untuk disimpan", "error")
        return
      }

      await window.electronAPI.upsertDhuhaGroupsWeekly({ body: { rows } })
      notify("Perubahan jadwal mingguan berhasil disimpan", "success")
      await fetchSchedules()
    } catch (error) {
      notify("Gagal menyimpan jadwal mingguan: " + error, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const openPrayerEdit = (index: number) => {
    setEditingPrayerIndex(index)
    setPrayerDraft({ ...prayerCards[index] })
  }

  const closePrayerEdit = () => {
    setEditingPrayerIndex(null)
    setPrayerDraft(null)
  }

  const savePrayerEdit = async () => {
    if (editingPrayerIndex === null || !prayerDraft) return
    setIsSaving(true)

    // Optimistic: update card immediately
    const prevCards = [...prayerCards]
    setPrayerCards(cards => cards.map((c, i) => i === editingPrayerIndex ? { ...c, waktuMulai: prayerDraft.waktuMulai, waktuSelesai: prayerDraft.waktuSelesai, jurusan: prayerDraft.jurusan } : c))
    closePrayerEdit()

    try {
      const prayerName = prayerDraft.nama
      const relatedSchedules = rawSchedules.filter(s => s.waktu_sholat?.jenis_sholat?.nama_jenis === prayerName)
      const waktuId = relatedSchedules[0]?.waktu_sholat?.id_waktu

      if (waktuId) {
        await window.electronAPI.updatePrayerTime({
          id: waktuId,
          body: { waktu_mulai: prayerDraft.waktuMulai, waktu_selesai: prayerDraft.waktuSelesai }
        })
      }

      const jurusanIds = prayerDraft.jurusan
        .map((name: string) => allJurusan.find(j => j.nama_jurusan === name)?.id_jurusan)
        .filter(Boolean)

      if (relatedSchedules.length > 0) {
        await Promise.all(relatedSchedules.map(s =>
          window.electronAPI.updatePrayerSchedule({ id_jadwal: s.id_jadwal, body: { jurusan_ids: jurusanIds } })
        ))
      }

      notify(`Jadwal ${prayerName} berhasil diperbarui`, "success")
    } catch (error) {
      // Rollback
      setPrayerCards(prevCards)
      notify("Gagal menyimpan perubahan: " + error, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePrayer = async () => {
    if (!newPrayerName.trim()) { notify("Nama jenis sholat wajib diisi", "error"); return }
    setIsCreating(true)
    try {
      // Create prayer type
      const typeRes: any = await window.electronAPI.createPrayerType({ body: { nama_jenis: newPrayerName.trim(), butuh_giliran: false } })
      const typeData = typeRes?.data ?? typeRes
      const idJenis = typeData?.id_jenis
      if (!idJenis) throw new Error("Gagal membuat jenis sholat")

      // Create prayer time for this type
      await window.electronAPI.createPrayerTime({ body: { id_jenis: idJenis, waktu_mulai: newPrayerStart, waktu_selesai: newPrayerEnd } })

      notify(`Jadwal ${newPrayerName} berhasil ditambahkan`, "success")
      setCreatePrayerOpen(false)
      setNewPrayerName("")
      setNewPrayerStart("06:00")
      setNewPrayerEnd("07:00")
      await fetchSchedules()
    } catch (err: any) {
      notify(err.message || "Gagal menambahkan jadwal sholat", "error")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePrayer = async (prayer: PrayerCard) => {
    if (!confirm(`Hapus jadwal ${prayer.nama}?`)) return
    try {
      // Find the prayer type id from raw schedules
      const related = rawSchedules.find(s => s.waktu_sholat?.jenis_sholat?.nama_jenis === prayer.nama)
      const idJenis = related?.waktu_sholat?.jenis_sholat?.id_jenis
      if (idJenis) {
        await window.electronAPI.deletePrayerType({ id: idJenis })
        notify(`Jadwal ${prayer.nama} berhasil dihapus`, "success")
        await fetchSchedules()
      }
    } catch (err: any) {
      notify(err.message || "Gagal menghapus jadwal", "error")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">Memuat jadwal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Jadwal Jurusan Mingguan</CardTitle>
          {!readOnly && hasJadwalChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setJadwalRows(savedJadwalRows)
                  setSelectedJadwalCell(null)
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveWeeklyJadwal} disabled={isSaving}>
                {isSaving ? <Spinner size="sm" /> : "Save"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Hari</th>
                  <th className="px-4 py-3 text-left font-medium">Jurusan 1</th>
                  <th className="px-4 py-3 text-left font-medium">Jurusan 2</th>
                </tr>
              </thead>
              <tbody>
                {jadwalRows.map((row, rowIndex) => (
                  <tr key={row.hari} className="border-t">
                    <td className="px-4 py-3 font-medium">{row.hari}</td>
                    {(["jurusan1", "jurusan2"] as const).map((column) => {
                      const isSelected =
                        selectedJadwalCell?.rowIndex === rowIndex &&
                        selectedJadwalCell?.column === column
                      return (
                        <td key={`${row.hari}-${column}`} className="px-4 py-3">
                          <button
                            type="button"
                            disabled={readOnly || isSaving}
                            onClick={() => handleSwapCellClick(rowIndex, column)}
                            className={`w-full rounded-md border px-3 py-2 text-left font-medium transition ${isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : `bg-background ${readOnly ? "cursor-default" : "hover:bg-muted/50"}`
                              }`}
                          >
                            {row[column]}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Jadwal Sholat</h3>
          {!readOnly && (
            <Button size="sm" onClick={() => setCreatePrayerOpen(true)}>
              <Plus className="mr-2 size-4" /> Tambah Jadwal
            </Button>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {prayerCards.map((prayer, index) => (
            <Card key={prayer.nama} className="border">
              <CardHeader className="flex-row items-start justify-between">
                <CardTitle>{prayer.nama}</CardTitle>
                {!readOnly && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon-sm" onClick={() => openPrayerEdit(index)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" className="text-destructive" onClick={() => handleDeletePrayer(prayer)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Waktu</span>
                  <span className="font-medium">{formatWaktuRange(prayer.waktuMulai, prayer.waktuSelesai)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jurusan</span>
                  <span className="font-medium">{formatJurusan(prayer.jurusan)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={editingPrayerIndex !== null} onOpenChange={(open) => !open && closePrayerEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jadwal {prayerDraft?.nama ?? ""}</DialogTitle>
            <DialogDescription>Ubah data jadwal sholat untuk kartu ini.</DialogDescription>
          </DialogHeader>
          {prayerDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Waktu Mulai</Label>
                  <TimePicker
                    value={prayerDraft.waktuMulai}
                    onChange={(val) => setPrayerDraft((curr: any) => curr ? { ...curr, waktuMulai: val } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Waktu Selesai</Label>
                  <TimePicker
                    value={prayerDraft.waktuSelesai}
                    onChange={(val) => setPrayerDraft((curr: any) => curr ? { ...curr, waktuSelesai: val } : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Jurusan</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" className="w-full justify-start font-normal">
                      {prayerDraft.jurusan.length > 0 ? formatJurusan(prayerDraft.jurusan) : "Pilih jurusan"}
                    </Button>
                  } />
                  <DropdownMenuContent className="w-[var(--anchor-width)]" align="start">
                    {dynamicMajorOptions.map((major) => (
                      <DropdownMenuCheckboxItem
                        key={major}
                        checked={prayerDraft.jurusan.includes(major)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) => {
                          setPrayerDraft((current: any) => {
                            if (!current) return current
                            const nextMajors = checked
                              ? Array.from(new Set([...current.jurusan, major]))
                              : current.jurusan.filter((item: string) => item !== major)
                            return { ...current, jurusan: nextMajors }
                          })
                        }}
                      >
                        {major}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closePrayerEdit} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={savePrayerEdit} disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" /> : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Prayer Type Dialog */}
      <Dialog open={createPrayerOpen} onOpenChange={setCreatePrayerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Sholat</DialogTitle>
            <DialogDescription>Tambahkan jenis sholat baru beserta waktu pelaksanaannya.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama Jenis Sholat <span className="text-destructive">*</span></Label>
              <Input value={newPrayerName} onChange={(e) => setNewPrayerName(e.target.value)} placeholder="Contoh: Dhuha, Dzuhur, Ashar" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Waktu Mulai</Label>
                <TimePicker value={newPrayerStart} onChange={setNewPrayerStart} />
              </div>
              <div className="grid gap-2">
                <Label>Waktu Selesai</Label>
                <TimePicker value={newPrayerEnd} onChange={setNewPrayerEnd} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePrayerOpen(false)}>Batal</Button>
            <Button onClick={handleCreatePrayer} disabled={isCreating}>{isCreating ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatHHMM(time: string): string {
  if (!time) return "00:00"
  return time.substring(0, 5)
}

function TimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [hours, minutes] = (value || "00:00").split(":")

  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="outline" className="w-full justify-start font-normal">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          {value}
        </Button>
      } />
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Jam</Label>
            <Select value={hours} onValueChange={(h) => onChange(`${h}:${minutes}`)}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = i.toString().padStart(2, "0")
                  return <SelectItem key={h} value={h}>{h}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
          <span className="mt-4 font-bold text-lg">:</span>
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Menit</Label>
            <Select value={minutes} onValueChange={(m) => onChange(`${hours}:${m}`)}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 60 }).map((_, i) => {
                  const m = i.toString().padStart(2, "0")
                  return <SelectItem key={m} value={m}>{m}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
