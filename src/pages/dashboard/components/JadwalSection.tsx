import { useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Clock, Plus, Trash2, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAJOR_OPTIONS, initialJadwalRows, initialPrayerCards } from "@/pages/dashboard/constants"
import type { JadwalRow, PrayerCard, JadwalCell } from "@/pages/dashboard/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/lib/notify"
import { extractData, handleApiError } from "@/lib/api-utils"
import { format } from "date-fns"
import { formatDateID } from "@/lib/date-utils"
import { DAY_NAMES, DAY_ORDER } from "@/lib/day-names"
import { cn } from "@/lib/utils"

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
  hari: string | null
  tanggal_khusus?: string | null
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
  const [editMode, setEditMode] = useState<"hari" | "tanggal">("hari")
  const [editHari, setEditHari] = useState<Set<string>>(new Set())
  const [editTanggal, setEditTanggal] = useState<Date | null>(null)

  // Create prayer type state
  const [createPrayerOpen, setCreatePrayerOpen] = useState(false)
  const [newPrayerName, setNewPrayerName] = useState("")
  const [newPrayerStart, setNewPrayerStart] = useState("06:00")
  const [newPrayerEnd, setNewPrayerEnd] = useState("07:00")
  const [newPrayerJurusan, setNewPrayerJurusan] = useState<string[]>([])
  // "hari" = weekly repeating, "tanggal" = one-time specific date
  const [newPrayerMode, setNewPrayerMode] = useState<"hari" | "tanggal">("hari")
  const [newPrayerHari, setNewPrayerHari] = useState<Set<string>>(new Set(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]))
  const [newPrayerTanggal, setNewPrayerTanggal] = useState<Date | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletePrayerTarget, setDeletePrayerTarget] = useState<PrayerCard | null>(null)

  const [dynamicMajorOptions, setDynamicMajorOptions] = useState<string[]>(MAJOR_OPTIONS)
  const [prayerTypesList, setPrayerTypesList] = useState<{ id_jenis: number; nama_jenis: string }[]>([])
  const [prayerTimes, setPrayerTimes] = useState<any[]>([])
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
      setPrayerTypesList(prayerTypes)
      setPrayerTimes(prayerTimes)

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
      const prayerTypeCardMap = new Map<string, { waktuSholat: any; jurusans: Set<string>; haris: Set<string>; tanggalKhusus: string | null; idJadwal: number }>()
      for (const s of schedules) {
        const name = s.waktu_sholat?.jenis_sholat?.nama_jenis
        if (!name) continue
        if (!prayerTypeCardMap.has(name)) {
          prayerTypeCardMap.set(name, { waktuSholat: s.waktu_sholat, jurusans: new Set(), haris: new Set(), tanggalKhusus: s.tanggal_khusus ?? null, idJadwal: s.id_jadwal })
        }
        const entry = prayerTypeCardMap.get(name)!
        if (s.jurusans) {
          for (const j of s.jurusans) entry.jurusans.add(j.nama_jurusan)
        }
        if (s.hari) entry.haris.add(s.hari)
        if (s.tanggal_khusus) entry.tanggalKhusus = s.tanggal_khusus
      }

      const jakartaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
      const todayDay = DAY_NAMES[jakartaNow.getDay()]
      const dhuhaEntry = prayerTypeCardMap.get("Dhuha")
      if (dhuhaEntry) {
        const todayMajors = dhuhaSchedules.filter(j => j.hari_dhuha === todayDay)
        if (todayMajors.length > 0) {
          dhuhaEntry.jurusans = new Set(todayMajors.map(j => j.nama_jurusan))
        }
      }

      const cards: PrayerCard[] = Array.from(prayerTypeCardMap.entries()).map(([name, { waktuSholat, jurusans, haris, tanggalKhusus, idJadwal }]) => ({
        id: idJadwal,
        nama: name,
        waktuMulai: formatHHMM(waktuSholat.waktu_mulai),
        waktuSelesai: formatHHMM(waktuSholat.waktu_selesai),
        jurusan: Array.from(jurusans),
        kelas: [],
        hari: haris.size > 0 ? Array.from(haris).sort((a, b) => (DAY_ORDER as readonly string[]).indexOf(a) - (DAY_ORDER as readonly string[]).indexOf(b)) : undefined,
        tanggalKhusus: tanggalKhusus ? tanggalKhusus.slice(0, 10) : undefined,
      }))

      // Add cards for prayer times that have no schedules yet
      for (const t of prayerTimes) {
        const name = t.jenis_sholat?.nama_jenis ?? typeMap.get(t.id_jenis)?.nama_jenis
        if (name && !prayerTypeCardMap.has(name)) {
          cards.push({ nama: name, waktuMulai: formatHHMM(t.waktu_mulai), waktuSelesai: formatHHMM(t.waktu_selesai), jurusan: [], kelas: [] })
        }
      }

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
    if (majors.length === dynamicMajorOptions.length) return "Semua Konsentrasi Keahlian"
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
    const card = prayerCards[index]
    setEditingPrayerIndex(index)
    setPrayerDraft({ ...card })
    if (card.tanggalKhusus) {
      setEditMode("tanggal")
      setEditTanggal(new Date(card.tanggalKhusus!.slice(0, 10) + "T00:00:00"))
      setEditHari(new Set())
    } else {
      setEditMode("hari")
      setEditHari(new Set(card.hari ?? []))
      setEditTanggal(null)
    }
  }

  const closePrayerEdit = () => {
    setEditingPrayerIndex(null)
    setPrayerDraft(null)
  }

  const savePrayerEdit = async () => {
    if (editingPrayerIndex === null || !prayerDraft) return
    setIsSaving(true)

    const originalName = prayerCards[editingPrayerIndex].nama
    const prevCards = [...prayerCards]

    const newHari = editMode === "hari" ? Array.from(editHari) : []
    const newTanggal = editMode === "tanggal" && editTanggal ? format(editTanggal, "yyyy-MM-dd") : null

    setPrayerCards(cards => cards.map((c, i) => i === editingPrayerIndex ? { ...c, nama: prayerDraft.nama, waktuMulai: prayerDraft.waktuMulai, waktuSelesai: prayerDraft.waktuSelesai, jurusan: prayerDraft.jurusan, hari: newHari.length > 0 ? newHari : undefined, tanggalKhusus: newTanggal ?? undefined } : c))
    closePrayerEdit()

    try {
      const relatedSchedules = rawSchedules.filter(s => s.waktu_sholat?.jenis_sholat?.nama_jenis === originalName)
      const waktuId = relatedSchedules[0]?.waktu_sholat?.id_waktu
      const jenisId = relatedSchedules[0]?.waktu_sholat?.jenis_sholat?.id_jenis
        ?? prayerTypesList.find(t => t.nama_jenis === originalName)?.id_jenis

      if (jenisId && prayerDraft.nama !== originalName) {
        await window.electronAPI.updatePrayerType({ id: jenisId, body: { nama_jenis: prayerDraft.nama } })
      }

      if (waktuId) {
        await window.electronAPI.updatePrayerTime({
          id: waktuId,
          body: { waktu_mulai: prayerDraft.waktuMulai, waktu_selesai: prayerDraft.waktuSelesai }
        })
      }

      const jurusanIds = prayerDraft.jurusan
        .map((name: string) => allJurusan.find(j => j.nama_jurusan === name)?.id_jurusan)
        .filter(Boolean)

      const originalHari = prayerCards[editingPrayerIndex].hari ?? []
      const originalTanggal = prayerCards[editingPrayerIndex].tanggalKhusus ?? null
      const modeChanged = (editMode === "hari" && originalTanggal) || (editMode === "tanggal" && originalHari.length > 0)
      const hariChanged = editMode === "hari" && JSON.stringify(newHari.sort()) !== JSON.stringify([...originalHari].sort())
      const tanggalChanged = editMode === "tanggal" && newTanggal !== originalTanggal

      if ((modeChanged || hariChanged || tanggalChanged) && relatedSchedules.length > 0) {
        for (const s of relatedSchedules) {
          await window.electronAPI.deletePrayerSchedule({ id_jadwal: s.id_jadwal })
        }
        if (editMode === "hari" && newHari.length > 0) {
          await Promise.all(newHari.map(hari =>
            window.electronAPI.createPrayerSchedule({ body: { hari, id_waktu: waktuId, jurusan_ids: jurusanIds } })
          ))
        } else if (editMode === "tanggal" && newTanggal) {
          await window.electronAPI.createPrayerSchedule({ body: { tanggal_khusus: newTanggal, id_waktu: waktuId, jurusan_ids: jurusanIds } })
        }
      } else if (relatedSchedules.length > 0) {
        await Promise.all(relatedSchedules.map(s =>
          window.electronAPI.updatePrayerSchedule({ id_jadwal: s.id_jadwal, body: { jurusan_ids: jurusanIds } })
        ))
      }

      notify(`Jadwal ${prayerDraft.nama} berhasil diperbarui`, "success")
    } catch (error) {
      setPrayerCards(prevCards)
      notify("Gagal menyimpan perubahan: " + error, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const resetCreateForm = () => {
    setNewPrayerName("")
    setNewPrayerStart("06:00")
    setNewPrayerEnd("07:00")
    setNewPrayerJurusan([])
    setNewPrayerMode("hari")
    setNewPrayerHari(new Set(["Senin", "Selasa", "Rabu", "Kamis"]))
    setNewPrayerTanggal(null)
  }

  const handleCreatePrayer = async () => {
    if (!newPrayerName.trim()) { notify("Nama jenis sholat wajib diisi", "error"); return }
    if (newPrayerName.trim() === "Dhuha") { notify("Dhuha adalah jenis sholat bawaan dan tidak dapat ditambahkan lagi", "error"); return }
    if (newPrayerMode === "hari" && newPrayerHari.size === 0) { notify("Pilih minimal satu hari", "error"); return }
    if (newPrayerMode === "tanggal" && !newPrayerTanggal) { notify("Tanggal khusus wajib dipilih", "error"); return }

    setIsCreating(true)
    try {
      // Resolve jurusan IDs — default to all jurusan if none selected
      const selectedJurusanIds = newPrayerJurusan.length > 0
        ? newPrayerJurusan.map(name => allJurusan.find(j => j.nama_jurusan === name)?.id_jurusan).filter(Boolean) as number[]
        : allJurusan.map(j => j.id_jurusan)

      // Check / create prayer type
      let idJenis = prayerTypesList.find(t => t.nama_jenis === newPrayerName.trim())?.id_jenis
      if (!idJenis) {
        const typeRes: any = await window.electronAPI.createPrayerType({ body: { nama_jenis: newPrayerName.trim(), butuh_giliran: false } })
        const typeData = typeRes?.data ?? typeRes
        idJenis = typeData?.id_jenis
        if (!idJenis) throw new Error("Gagal membuat jenis sholat")
      }

      // Create prayer time for this type
      const timeRes: any = await window.electronAPI.createPrayerTime({
        body: { id_jenis: idJenis, waktu_mulai: newPrayerStart, waktu_selesai: newPrayerEnd, berlaku_mulai: new Date().toISOString().slice(0, 10) }
      })
      const timeData = timeRes?.data ?? timeRes
      const idWaktu = timeData?.id_waktu
      if (!idWaktu) throw new Error("Gagal membuat waktu sholat")

      if (newPrayerMode === "hari") {
        // Repeating weekly schedule — one entry per selected day
        await Promise.all(Array.from(newPrayerHari).map(hari =>
          window.electronAPI.createPrayerSchedule({ body: { hari, id_waktu: idWaktu, jurusan_ids: selectedJurusanIds } })
        ))
      } else {
        // One-time specific date
        const tanggalStr = format(newPrayerTanggal!, "yyyy-MM-dd")
        await window.electronAPI.createPrayerSchedule({ body: { tanggal_khusus: tanggalStr, id_waktu: idWaktu, jurusan_ids: selectedJurusanIds } })
      }

      notify(`Jadwal ${newPrayerName} berhasil ditambahkan`, "success")
      setCreatePrayerOpen(false)
      resetCreateForm()
      await fetchSchedules()
    } catch (err: any) {
      notify(handleApiError(err) || "Gagal menambahkan jadwal sholat", "error")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePrayer = async (prayer: PrayerCard) => {
    setDeletePrayerTarget(prayer)
  }

  const confirmDeletePrayer = async () => {
    if (!deletePrayerTarget) return
    try {
      const relatedSchedules = rawSchedules.filter(
        (s) => s.waktu_sholat?.jenis_sholat?.nama_jenis === deletePrayerTarget.nama
      )
      if (relatedSchedules.length > 0) {
        for (const s of relatedSchedules) {
          await window.electronAPI.deletePrayerSchedule({ id_jadwal: s.id_jadwal })
        }
        notify(`Jadwal ${deletePrayerTarget.nama} berhasil dihapus`, "success")
        await fetchSchedules()
      } else {
        const typeObj = prayerTypesList.find((t) => t.nama_jenis === deletePrayerTarget.nama)
        if (typeObj) {
          await window.electronAPI.deletePrayerType({ id: typeObj.id_jenis })
          notify(`Jadwal ${deletePrayerTarget.nama} berhasil dihapus`, "success")
          await fetchSchedules()
        } else {
          notify("Data jadwal tidak ditemukan", "error")
        }
      }
    } catch (err: any) {
      notify(handleApiError(err) || "Gagal menghapus jadwal", "error")
    } finally {
      setDeletePrayerTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">memuat jadwal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Jadwal Konsentrasi Keahlian Mingguan</CardTitle>
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
                Batal
              </Button>
              <Button size="sm" onClick={handleSaveWeeklyJadwal} disabled={isSaving}>
                {isSaving ? <Spinner size="sm" /> : "Simpan"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-18rem)]">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Hari</th>
                  <th className="px-4 py-3 text-left font-medium">Konsentrasi Keahlian 1</th>
                  <th className="px-4 py-3 text-left font-medium">Konsentrasi Keahlian 2</th>
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
                {!readOnly && prayer.nama !== "Dhuha" && (
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
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Konsentrasi Keahlian</span>
                  <span className="font-medium text-right max-w-[60%]">{formatJurusan(prayer.jurusan)}</span>
                </div>
                {prayer.tanggalKhusus ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400">
                      {new Date(prayer.tanggalKhusus.slice(0, 10) + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                ) : prayer.hari && prayer.hari.length > 0 ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Hari</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {prayer.hari.map(h => (
                        <span key={h} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={editingPrayerIndex !== null} onOpenChange={(open) => !open && closePrayerEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Jadwal {prayerDraft?.nama ?? ""}</DialogTitle>
            <DialogDescription>Ubah data jadwal sholat untuk kartu ini.</DialogDescription>
          </DialogHeader>
          {prayerDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Jenis Sholat</Label>
                <Input value={prayerDraft.nama} onChange={(e) => setPrayerDraft((curr: any) => curr ? { ...curr, nama: e.target.value } : null)} />
              </div>
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
                <Label>Konsentrasi Keahlian</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" className="w-full justify-start font-normal">
                      {prayerDraft.jurusan.length > 0 ? formatJurusan(prayerDraft.jurusan) : "Pilih konsentrasi keahlian"}
                    </Button>
                  } />
                  <DropdownMenuContent className="w-[var(--anchor-width)]" align="start">
                    {dynamicMajorOptions.map((major) => (
                      <DropdownMenuCheckboxItem
                        key={major}
                        checked={prayerDraft.jurusan.includes(major)}
                        disabled={prayerDraft.nama === "Dhuha" && !prayerDraft.jurusan.includes(major) && prayerDraft.jurusan.length >= 2}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) => {
                          setPrayerDraft((current: any) => {
                            if (!current) return current
                            if (current.nama.toLowerCase() === "dhuha" && checked && current.jurusan.length >= 2) return current
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
                {prayerDraft.nama === "Dhuha" && (
                  <p className="text-xs text-muted-foreground">maks. 2 konsentrasi keahlian per hari</p>
                )}
              </div>

              {/* Mode: Berulang / Tanggal Khusus */}
              <div className="space-y-2">
                <Label>Tipe Jadwal</Label>
                <div className="flex items-center rounded-lg border bg-muted p-1">
                  <Button
                    type="button"
                    variant={editMode === "hari" ? "secondary" : "ghost"}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setEditMode("hari")}
                  >
                    Berulang (Hari)
                  </Button>
                  <Button
                    type="button"
                    variant={editMode === "tanggal" ? "secondary" : "ghost"}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setEditMode("tanggal")}
                  >
                    Tanggal Khusus
                  </Button>
                </div>
              </div>

              {/* Hari (shown when mode = hari) */}
              {editMode === "hari" && (
                <div className="space-y-2">
                  <Label>Hari <span className="text-destructive">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_ORDER.filter(d => d !== "Minggu").map((day) => {
                      const isSelected = editHari.has(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setEditHari(prev => {
                              const next = new Set(prev)
                              if (next.has(day)) next.delete(day)
                              else next.add(day)
                              return next
                            })
                          }}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          )}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">jadwal ini akan berulang setiap minggu pada hari yang dipilih</p>
                </div>
              )}

              {/* Tanggal Khusus (shown when mode = tanggal) */}
              {editMode === "tanggal" && (
                <div className="space-y-2">
                  <Label>Tanggal Khusus <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start font-normal", !editTanggal && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {editTanggal ? formatDateID(editTanggal) : "Pilih tanggal..."}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editTanggal ?? undefined}
                        onSelect={(d) => setEditTanggal(d ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">untuk sholat satu kali, mis. iduladha, idulfitri, dll.</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closePrayerEdit} disabled={isSaving}>
                  Batal
                </Button>
                <Button onClick={savePrayerEdit} disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" /> : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Prayer Type Dialog */}
      <Dialog open={createPrayerOpen} onOpenChange={(open) => { setCreatePrayerOpen(open); if (!open) resetCreateForm() }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Sholat</DialogTitle>
            <DialogDescription>Tambahkan jenis sholat baru beserta waktu dan konsentrasi keahlian.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Nama */}
            <div className="grid gap-2">
              <Label>Nama Jenis Sholat <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Select
                  value={prayerTypesList.find(t => t.nama_jenis === newPrayerName)?.nama_jenis ?? ""}
                  onValueChange={(val) => {
                    if (!val) return
                    setNewPrayerName(val)
                    const matched = prayerTypesList.find(t => t.nama_jenis === val)
                    if (matched) {
                      const times = prayerTimes.find((t: any) => t.id_jenis === matched.id_jenis)
                      if (times) {
                        setNewPrayerStart(times.waktu_mulai?.substring(0, 5) ?? "06:00")
                        setNewPrayerEnd(times.waktu_selesai?.substring(0, 5) ?? "07:00")
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-[2]">
                    <SelectValue placeholder="Pilih jenis sholat..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prayerTypesList.map((t) => (
                      <SelectItem key={t.id_jenis} value={t.nama_jenis}>{t.nama_jenis}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={prayerTypesList.find(t => t.nama_jenis === newPrayerName) ? "" : newPrayerName}
                  onChange={(e) => setNewPrayerName(e.target.value)}
                  placeholder="Atau ketik nama baru"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">pilih jenis yang sudah ada atau ketik nama baru untuk membuat jenis sholat baru</p>
            </div>

            {/* Waktu */}
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

            {/* Konsentrasi Keahlian */}
            <div className="grid gap-2">
              <Label>Konsentrasi Keahlian</Label>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {newPrayerJurusan.length === 0
                      ? "Semua konsentrasi keahlian"
                      : newPrayerJurusan.length === dynamicMajorOptions.length
                        ? "Semua Konsentrasi Keahlian"
                        : newPrayerJurusan.join(", ")}
                  </Button>
                } />
                <DropdownMenuContent className="w-[var(--anchor-width)]" align="start">
                  {dynamicMajorOptions.map((major) => (
                    <DropdownMenuCheckboxItem
                      key={major}
                      checked={newPrayerJurusan.includes(major)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) =>
                        setNewPrayerJurusan(prev =>
                          checked ? [...prev, major] : prev.filter(m => m !== major)
                        )
                      }
                    >
                      {major}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">kosongkan untuk semua konsentrasi keahlian</p>
            </div>

            {/* Mode: Berulang / Tanggal Khusus */}
            <div className="grid gap-2">
              <Label>Tipe Jadwal</Label>
              <div className="flex items-center rounded-lg border bg-muted p-1">
                <Button
                  type="button"
                  variant={newPrayerMode === "hari" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setNewPrayerMode("hari")}
                >
                  Berulang (Hari)
                </Button>
                <Button
                  type="button"
                  variant={newPrayerMode === "tanggal" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setNewPrayerMode("tanggal")}
                >
                  Tanggal Khusus
                </Button>
              </div>
            </div>

            {/* Hari (shown when mode = hari) */}
            {newPrayerMode === "hari" && (
              <div className="grid gap-2">
                <Label>Hari <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day) => {
                    const isSelected = newPrayerHari.has(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setNewPrayerHari(prev => {
                            const next = new Set(prev)
                            if (next.has(day)) next.delete(day)
                            else next.add(day)
                            return next
                          })
                        }}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">jadwal ini akan berulang setiap minggu pada hari yang dipilih</p>
              </div>
            )}

            {/* Tanggal Khusus (shown when mode = tanggal) */}
            {newPrayerMode === "tanggal" && (
              <div className="grid gap-2">
                <Label>Tanggal Khusus <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start font-normal", !newPrayerTanggal && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {newPrayerTanggal ? formatDateID(newPrayerTanggal) : "Pilih tanggal..."}
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newPrayerTanggal ?? undefined}
                      onSelect={(d) => setNewPrayerTanggal(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">untuk sholat satu kali, mis. iduladha, idulfitri, dll.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreatePrayerOpen(false); resetCreateForm() }}>Batal</Button>
            <Button onClick={handleCreatePrayer} disabled={isCreating}>{isCreating ? <Spinner size="sm" /> : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePrayerTarget !== null} onOpenChange={(open) => !open && setDeletePrayerTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jadwal Sholat</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus jadwal {deletePrayerTarget?.nama}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePrayerTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDeletePrayer}>Hapus</Button>
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
