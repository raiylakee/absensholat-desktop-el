import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Mail } from "lucide-react"
import { type UserProfileData } from "@/lib/auth-session"

function humanizeGender(g?: string): string {
  if (!g) return "-"
  if (g === "L") return "Laki-laki"
  if (g === "P") return "Perempuan"
  return g
}

export function SiswaProfile({ user }: { user?: UserProfileData }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const studentData = {
    nama: user?.name ?? "-",
    email: user?.email ?? "-",
    nis: user?.nis ?? "-",
    kelas: user?.className ?? "-",
    jurusan: user?.major ?? "-",
    jenisKelamin: humanizeGender(user?.gender),
    avatarFallback: user?.avatarFallback ?? "S",
  }

  return (
    <div className="flex-1 space-y-6">
      <Card className="w-full border">
        <CardHeader>
          <CardTitle>Profil Siswa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-20">
              <AvatarFallback className="text-xl font-semibold">{studentData.avatarFallback}</AvatarFallback>
            </Avatar>

            <div className="w-full space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{studentData.nama}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">NIS</span>
                <span className="font-medium">{studentData.nis}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Kelas</span>
                <span className="font-medium">{studentData.kelas}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Jurusan</span>
                <span className="font-medium">{studentData.jurusan}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Jenis Kelamin</span>
                <span className="font-medium">{studentData.jenisKelamin}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{studentData.email}</span>
              </div>

              <div className="grid gap-2 pt-4 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound className="mr-2 size-4" /> Ganti Kata Sandi
                </Button>
                <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
                  <Mail className="mr-2 size-4" /> Ubah Email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ganti Kata Sandi</DialogTitle>
            <DialogDescription>
              Masukkan kata sandi lama dan baru Anda untuk mengamankan akun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Kata Sandi Lama</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Kata Sandi Baru</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</Label>
              <Input id="confirm-password" type="password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Batal</Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Alamat Email</DialogTitle>
            <DialogDescription>
              Perbarui alamat email yang terhubung dengan akun siswa Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-email">Alamat Email Baru</Label>
              <Input id="new-email" type="email" placeholder="siswa@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-for-email">Kata Sandi Saat Ini</Label>
              <Input id="password-for-email" type="password" placeholder="Verifikasi identitas Anda" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Batal</Button>
            <Button onClick={() => setEmailDialogOpen(false)}>Perbarui Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
