import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Mail } from "lucide-react"
import { notify } from "@/lib/notify"
import { DeviceManagementSection } from "./DeviceManagementSection"
import { UserDeviceCard } from "./UserDeviceCard"

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
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")

  const currentUser = user ?? { name: "Admin User", role: "admin", email: "admin@example.com", avatarFallback: "AU" }
  const roleLabel = roleLabelMap[currentUser.role] ?? currentUser.role
  const genderLabel = humanizeGender(currentUser.gender)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { notify("Semua field wajib diisi", "error"); return }
    if (newPassword !== confirmPassword) { notify("Konfirmasi password tidak cocok", "error"); return }
    setPwLoading(true)
    try {
      await window.electronAPI.changePassword({ currentPassword, newPassword })
      notify("Kata sandi berhasil diubah", "success")
      setPasswordDialogOpen(false)
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch (err: any) { notify(err.message || "Gagal mengubah kata sandi", "error") }
    finally { setPwLoading(false) }
  }

  const handleRequestEmailChange = async () => {
    if (!newEmail) { notify("Email baru wajib diisi", "error"); return }
    setEmailLoading(true)
    try {
      await window.electronAPI.requestChangeEmail({ newEmail })
      notify("Kode OTP telah dikirim ke email baru", "success")
      setPendingEmail(newEmail)
      setEmailDialogOpen(false)
      setOtpDialogOpen(true)
      setNewEmail(""); setEmailPassword("")
    } catch (err: any) { notify(err.message || "Gagal mengirim permintaan", "error") }
    finally { setEmailLoading(false) }
  }

  const handleVerifyEmailOtp = async () => {
    if (!otp) { notify("Kode OTP wajib diisi", "error"); return }
    setOtpLoading(true)
    try {
      await window.electronAPI.verifyChangeEmail({ newEmail: pendingEmail, otp })
      notify("Email berhasil diubah", "success")
      setOtpDialogOpen(false)
      setOtp(""); setPendingEmail("")
    } catch (err: any) { notify(err.message || "Gagal verifikasi OTP", "error") }
    finally { setOtpLoading(false) }
  }

  return (
    <div className="min-h-[60vh] flex-1 space-y-6">
      <Card className="w-full border">
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
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

      {currentUser.role === "admin" ? <DeviceManagementSection /> : <UserDeviceCard />}

      <Dialog open={passwordDialogOpen} onOpenChange={(o) => { setPasswordDialogOpen(o); if (!o) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword("") } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Kata Sandi</DialogTitle>
            <DialogDescription>Masukkan kata sandi saat ini dan kata sandi baru.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kata Sandi Saat Ini</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Kata Sandi Baru</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Konfirmasi Kata Sandi Baru</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Batal</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading}>{pwLoading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={(o) => { setEmailDialogOpen(o); if (!o) { setNewEmail(""); setEmailPassword("") } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Alamat Email</DialogTitle>
            <DialogDescription>Kode OTP akan dikirim ke email baru untuk verifikasi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Alamat Email Baru</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email.baru@gmail.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Batal</Button>
            <Button onClick={handleRequestEmailChange} disabled={emailLoading}>{emailLoading ? "Mengirim..." : "Kirim OTP"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={otpDialogOpen} onOpenChange={(o) => { setOtpDialogOpen(o); if (!o) setOtp("") }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verifikasi OTP</DialogTitle>
            <DialogDescription>Masukkan kode OTP yang dikirim ke {pendingEmail}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kode OTP</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtpDialogOpen(false)}>Batal</Button>
            <Button onClick={handleVerifyEmailOtp} disabled={otpLoading}>{otpLoading ? "Memverifikasi..." : "Verifikasi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
