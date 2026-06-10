import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { formatDateID } from "@/lib/date-utils"

export interface HalanganStudent {
  id_halangan: number
  nis: string
  nama_siswa: string
  kelas: string
  jurusan: string
  jk: string
  tanggal: string
}

interface HalanganDialogProps {
  student: HalanganStudent | null
  isProcessing: boolean
  onApprove: (id: number, keterangan?: string) => void
  onReject: (id: number, keterangan: string) => void
  onClose: () => void
}

export function HalanganDialog({
  student,
  isProcessing,
  onApprove,
  onReject,
  onClose,
}: HalanganDialogProps) {
  const [keterangan, setKeterangan] = useState("haid")
  const [mode, setMode] = useState<"approve" | "reject" | null>(null)

  const handleApprove = () => {
    if (!student) return
    setMode("approve")
    onApprove(student.id_halangan, keterangan || undefined)
  }

  const handleReject = () => {
    if (!student) return
    if (!keterangan.trim()) return
    setMode("reject")
    onReject(student.id_halangan, keterangan)
  }

  const handleClose = () => {
    setMode(null)
    setKeterangan("haid")
    onClose()
  }

  return (
    <Dialog open={student !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Validasi Halangan</DialogTitle>
          <DialogDescription>
            Verifikasi pengajuan halangan siswi sebelum menyetujui.
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-4">
              <div>
                <span className="text-xs text-muted-foreground">Nama</span>
                <p className="font-medium">{student.nama_siswa}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">NIS</span>
                <p className="font-medium">{student.nis}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Kelas</span>
                <p className="font-medium">{student.kelas || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Konsentrasi Keahlian</span>
                <p className="font-medium">{student.jurusan || "-"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Jenis Kelamin</span>
                <Badge variant="outline" className="bg-pink-50 text-pink-700">
                  Perempuan
                </Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tanggal</span>
                <p className="font-medium">{formatDateID(student.tanggal)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="halangan-keterangan">Keterangan</Label>
              <Input
                id="halangan-keterangan"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="haid"
              />
              {mode === "reject" && !keterangan.trim() && (
                <p className="text-xs text-destructive">Alasan penolakan wajib diisi</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing || !keterangan.trim()}
          >
            {isProcessing && mode === "reject" ? <Spinner size="sm" className="mr-2" /> : null}
            Tolak
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing && mode === "approve" ? <Spinner size="sm" className="mr-2" /> : null}
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
