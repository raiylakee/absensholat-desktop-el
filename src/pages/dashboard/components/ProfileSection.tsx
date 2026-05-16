import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Mail } from "lucide-react"
import { DeviceManagementSection } from "./DeviceManagementSection"

interface UserProfile {
  name: string
  role: string
  email: string
  nip?: string
  gender?: string
  className?: string
  avatarFallback: string
}

const roleLabelMap: Record<string, string> = {
  admin: "Administrator",
  guru: "Guru",
  wali_kelas: "Wali Kelas",
  siswa: "Siswa",
}

function humanizeGender(g?: string): string | undefined {
  if (!g) return undefined
  if (g === "L") return "Laki-laki"
  if (g === "P") return "Perempuan"
  return g
}

export function ProfileSection({ user }: { user?: UserProfile }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const currentUser = user ?? {
    name: "Admin User",
    role: "admin",
    email: "admin@example.com",
    avatarFallback: "AU"
  }
  const roleLabel = roleLabelMap[currentUser.role] ?? currentUser.role
  const genderLabel = humanizeGender(currentUser.gender)

  return (
    <div className="min-h-[60vh] flex-1 space-y-6">
      <Card className="w-full border">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-20">
              <AvatarFallback className="text-xl font-semibold">{currentUser.avatarFallback}</AvatarFallback>
            </Avatar>

            <div className="w-full space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Jabatan</span>
                <span className="font-medium">{roleLabel}</span>
              </div>
              {currentUser.nip && currentUser.role !== "admin" && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">NIP</span>
                  <span className="font-medium">{currentUser.nip}</span>
                </div>
              )}
              {genderLabel && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Jenis Kelamin</span>
                  <span className="font-medium">{genderLabel}</span>
                </div>
              )}
              {currentUser.className && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Kelas Diampu</span>
                  <span className="font-medium">{currentUser.className}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{currentUser.email}</span>
              </div>

              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound className="mr-2 size-4" /> Ubah Kata Sandi
                </Button>
                <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
                  <Mail className="mr-2 size-4" /> Ubah Email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeviceManagementSection />

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Kata Sandi</DialogTitle>
            <DialogDescription>
              Masukkan kata sandi saat ini dan kata sandi baru untuk mengamankan akun Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
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

      {/* Change Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Alamat Email</DialogTitle>
            <DialogDescription>
              Perbarui alamat email yang terhubung dengan akun administrator Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-email">Alamat Email Baru</Label>
              <Input id="new-email" type="email" placeholder="newadmin@example.com" />
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
