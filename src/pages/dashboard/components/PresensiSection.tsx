import { useMemo, useState, useEffect, useRef } from "react"
import { Eye, Filter, Paperclip, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  MAJOR_OPTIONS,
} from "@/pages/dashboard/constants"
import type { PresensiRecord } from "@/pages/dashboard/types"
import { notify } from "@/lib/notify"
import { extractData, normalizeAttendance } from "@/lib/api-utils"
import { usePrintAction } from "@/hooks/use-print-action"
import { PrintHeader } from "@/components/print-header"
import { BuktiFotoPreview } from "@/components/bukti-foto-preview"
import { useDownloadAction } from "@/hooks/use-download-action"

interface IzinDetail {
  id_pengajuan: number
  jenis_izin: string
  keterangan: string
  tanggal_awal: string
  tanggal_akhir: string
  bukti_foto_url?: string
  status?: string
  catatan_verifikasi?: string | null
}

interface PresensiSectionProps {
  forcedClass?: string
}

export function PresensiSection({ forcedClass }: PresensiSectionProps) {
  const { print } = usePrintAction()
  const { isDownloading, download } = useDownloadAction()
  const [presensiRecords, setPresensiRecords] = useState<PresensiRecord[]>([])
  const [prayerTypes, setPrayerTypes] = useState<string[]>([])
  const [presensiSearchQuery, setPresensiSearchQuery] = useState("")
  const [selectedSholatFilters, setSelectedSholatFilters] = useState<PresensiRecord["jenisSholat"][]>([])
  const [selectedPresensiJurusanFilters, setSelectedPresensiJurusanFilters] = useState<string[]>([])
  const [selectedPresensiKelasFilters, setSelectedPresensiKelasFilters] = useState<string[]>([])
  const [detailPresensi, setDetailPresensi] = useState<PresensiRecord | null>(null)
  const [izinDetail, setIzinDetail] = useState<IzinDetail | null>(null)
  const [isLoadingIzin, setIsLoadingIzin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 50
  const isMounted = useRef(true)

  const presensiClassOptions = useMemo(
    () => Array.from(new Set(presensiRecords.map((record) => record.kelas))),
    [presensiRecords]
  )

  const filteredRecords = useMemo(() => {
    return presensiRecords.filter(record => {
      const matchSholat = selectedSholatFilters.length === 0 || selectedSholatFilters.includes(record.jenisSholat as any)
      const matchKelas = selectedPresensiKelasFilters.length === 0 || selectedPresensiKelasFilters.includes(record.kelas)
      return matchSholat && matchKelas
    })
  }, [presensiRecords, selectedSholatFilters, selectedPresensiKelasFilters])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response: any = await window.electronAPI.getAttendanceHistory({
        page: currentPage,
        limit: pageSize,
        search: presensiSearchQuery || undefined,
        jurusan: selectedPresensiJurusanFilters.length > 0 ? selectedPresensiJurusanFilters[0] : undefined,
      })
      const wrapper: any = extractData(response);
      const absensi = wrapper?.absensi ?? wrapper ?? [];
      const mapped: PresensiRecord[] = Array.isArray(absensi) ? absensi.map((item: any) => normalizeAttendance(item) as PresensiRecord) : [];
      if (!isMounted.current) return
      setPresensiRecords(mapped)
      const pagination = wrapper?.pagination ?? {};
      setTotalPages(pagination.total_pages ?? 1);
      setTotalItems(pagination.total_items ?? mapped.length);
    } catch (error) {
      if (!isMounted.current) return
      console.error("Gagal mengambil riwayat:", error)
      notify("Gagal mengambil riwayat presensi", "error")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchHistory()
    window.electronAPI.getPrayerTypes().then((res: any) => {
      const types: any[] = extractData(res) ?? []
      if (isMounted.current) setPrayerTypes(types.map(t => t.nama_jenis))
    })
    return () => { isMounted.current = false }
  }, [currentPage])

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    } else {
      fetchHistory()
    }
  }, [presensiSearchQuery, selectedPresensiJurusanFilters])

  const handleOpenDetail = async (record: PresensiRecord) => {
    setDetailPresensi(record)
    setIzinDetail(null)
    // Try to find the izin record for this student+date
    if (record.status === "Izin" || record.status === "Sakit") {
      setIsLoadingIzin(true)
      try {
        const response: any = await window.electronAPI.getPengajuanIzin()
        const list: any[] = extractData<any[]>(response) ?? []
        const tanggal = record.tanggal
        const match = list.find((item: any) => {
          const nis = item.siswa?.nis ?? ""
          const awal = item.tanggal_awal?.slice(0, 10)
          const akhir = item.tanggal_akhir?.slice(0, 10)
          return nis === record.nis && !!tanggal && !!awal && !!akhir && tanggal >= awal && tanggal <= akhir
        })
        if (match) {
          setIzinDetail({
            id_pengajuan: match.id_pengajuan,
            jenis_izin: match.jenis_izin,
            keterangan: match.keterangan,
            tanggal_awal: match.tanggal_awal,
            tanggal_akhir: match.tanggal_akhir,
            bukti_foto_url: match.bukti_foto_url,
            status: match.status,
            catatan_verifikasi: match.catatan_verifikasi,
          })
        }
      } catch {
        // non-critical, just show without izin detail
      } finally {
        setIsLoadingIzin(false)
      }
    }
  }

  const getStatusBadgeClassName = (status: string) => {
    if (status === "Hadir") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
    if (status === "Izin") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
    if (status === "Sakit") return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
    if (status === "Alpha") return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
    return "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400"
  }

  const handleDownloadBukti = async () => {
    if (!izinDetail?.bukti_foto_url) return

    const buktiUrl = izinDetail.bukti_foto_url

    // Extract filename from URL if available, fallback to bukti-izin-{YYYY-MM-DD}.{ext}
    const urlPath = buktiUrl.split("?")[0]
    const urlFilename = urlPath.split("/").pop() ?? ""
    const hasOriginalFilename = urlFilename.includes(".")

    // Determine extension from URL
    const extMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/)
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg"

    // Determine format for filename generator (fallback filename)
    const format = (ext === "pdf" ? "pdf" : "png") as "pdf" | "png"

    // Use the date from izin period (tanggal_awal) for the fallback filename
    const izinDate = izinDetail.tanggal_awal
      ? new Date(izinDetail.tanggal_awal)
      : new Date()

    await download({
      filenameOptions: {
        dataType: "bukti-izin",
        format,
        date: izinDate,
      },
      // Use original filename from URL as default if available
      ...(hasOriginalFilename ? { defaultPathOverride: urlFilename } : {}),
      fetchData: async () => {
        const response = await fetch(buktiUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        let binary = ""
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binary)
        return { data: base64, encoding: "base64" as const }
      },
      dialogFilters: [
        { name: "File Gambar", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        { name: "File PDF", extensions: ["pdf"] },
        { name: "Semua File", extensions: ["*"] },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lihat Presensi</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari presensi..."
              className="w-[220px]"
              value={presensiSearchQuery}
              onChange={(event) => setPresensiSearchQuery(event.target.value)}
            />
            {!forcedClass && (
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
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jenis Sholat</p>
                  {prayerTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={`presensi-sholat-${type}`}
                      checked={selectedSholatFilters.includes(type as any)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedSholatFilters((prev) =>
                          checked ? [...prev, type as any] : prev.filter((item) => item !== type)
                        )
                      }
                    >
                      {type}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Jurusan</p>
                  {MAJOR_OPTIONS.map((major) => (
                    <DropdownMenuCheckboxItem
                      key={`presensi-jurusan-${major}`}
                      checked={selectedPresensiJurusanFilters.includes(major)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedPresensiJurusanFilters((prev) =>
                          checked ? [...prev, major] : prev.filter((item) => item !== major)
                        )
                      }
                    >
                      {major}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Kelas</p>
                  {presensiClassOptions.map((kelas) => (
                    <DropdownMenuCheckboxItem
                      key={`presensi-kelas-${kelas}`}
                      checked={selectedPresensiKelasFilters.includes(kelas)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedPresensiKelasFilters((prev) =>
                          checked ? [...prev, kelas] : prev.filter((item) => item !== kelas)
                        )
                      }
                    >
                      {kelas}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">No</th>
                  <th className="px-4 py-3 text-left font-medium">NIS</th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium">Sholat</th>
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <Spinner className="mx-auto" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada riwayat presensi ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.nis}-${record.jenisSholat}-${record.tanggal}`} className="border-t">
                      <td className="px-4 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3 font-medium">{record.nis}</td>
                      <td className="px-4 py-3">{record.nama}</td>
                      <td className="px-4 py-3">{record.kelas}</td>
                      <td className="px-4 py-3">{record.jenisSholat}</td>
                      <td className="px-4 py-3">{record.tanggal || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClassName(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        {record.status === "Izin" || record.status === "Sakit" ? (
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetail(record)}>
                            <Eye className="mr-2 size-4" />
                            Detail
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between print:hidden">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredRecords.length} dari {totalItems} data
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

      <Dialog open={Boolean(detailPresensi)} onOpenChange={(open) => { if (!open) { setDetailPresensi(null); setIzinDetail(null) } }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader className="print:hidden">
            <DialogTitle>Detail Izin Presensi</DialogTitle>
            <DialogDescription>Informasi pengajuan izin siswa.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
          {isLoadingIzin ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : izinDetail ? (
            <div className="space-y-3 text-sm">
              <PrintHeader
                title="Detail Izin Presensi"
                studentName={detailPresensi?.nama}
                nis={detailPresensi?.nis}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Jenis</p>
                  <p className="font-medium capitalize">{izinDetail.jenis_izin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Periode</p>
                  <p className="font-medium">
                    {izinDetail.tanggal_awal?.slice(0, 10)} — {izinDetail.tanggal_akhir?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Keterangan</p>
                <p className="whitespace-pre-wrap break-words">{izinDetail.keterangan}</p>
              </div>
              {izinDetail.status === "ditolak" && izinDetail.catatan_verifikasi && (
                <div>
                  <p className="text-xs text-muted-foreground">Alasan Penolakan</p>
                  <p className="whitespace-pre-wrap break-words text-red-600">{izinDetail.catatan_verifikasi}</p>
                </div>
              )}
              {izinDetail.bukti_foto_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Bukti</p>
                  <BuktiFotoPreview
                    url={izinDetail.bukti_foto_url}
                    onDownload={handleDownloadBukti}
                    isDownloading={isDownloading}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="size-3" />
                  Tidak ada bukti terlampir
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data pengajuan izin tidak ditemukan.</p>
          )}
          </div>
          <DialogFooter className="print:hidden">
            <Button
              variant="outline"
              onClick={print}
              disabled={!izinDetail}
            >
              <Printer className="mr-2 size-4" />
              Cetak Detail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
