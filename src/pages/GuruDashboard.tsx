import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { WindowControls } from "@/components/titlebar"
import { NotificationIcon } from "@/components/notification-icon"
import { GuruSidebar } from "@/components/guru-sidebar"
import { DashboardOverviewSection } from "@/pages/dashboard/components/DashboardOverviewSection"
import { JadwalSection } from "@/pages/dashboard/components/JadwalSection"
import { PresensiSection } from "@/pages/dashboard/components/PresensiSection"
import { PengajuanIzinSection } from "@/pages/dashboard/components/PengajuanIzinSection"
import { LaporanSection } from "@/pages/dashboard/components/LaporanSection"
import { UnregisteredStudentsSection } from "@/pages/dashboard/components/UnregisteredStudentsSection"
import { ProfileSection } from "@/pages/dashboard/components/ProfileSection"
import { SettingsSection } from "@/pages/dashboard/components/SettingsSection"
import { PlaceholderSection } from "@/pages/dashboard/components/PlaceholderSection"
import { useCurrentProfile } from "@/hooks/use-current-profile"
import { FloatingFAQ } from "@/components/FloatingFAQ"

export default function GuruDashboard() {
  const [activeItem, setActiveItem] = useState("Beranda")
  const { profile } = useCurrentProfile()

  const teacherProfile = profile
    ? {
        ...profile,
        role:
          profile.className && (profile.role === "guru" || profile.role === "wali_kelas")
            ? `Wali Kelas ${profile.className}`
            : profile.role === "wali_kelas"
            ? "Wali Kelas"
            : profile.role,
      }
    : undefined

  const renderSection = () => {
    if (activeItem === "Beranda") return <DashboardOverviewSection onNavigate={setActiveItem} showQrButton={false} />
    if (activeItem === "Jadwal") return <JadwalSection readOnly />
    if (activeItem === "Presensi") return <PresensiSection forcedClass={profile?.className} />
    if (activeItem === "Pengajuan Izin") return <PengajuanIzinSection />
    if (activeItem === "Laporan") return <LaporanSection forcedClass={profile?.className} />
    if (activeItem === "Siswa Belum Terdaftar") return <UnregisteredStudentsSection forcedClass={profile?.className} />
    if (activeItem === "Profile") return <ProfileSection user={teacherProfile} />
    if (activeItem === "Settings") return <SettingsSection />
    return <PlaceholderSection title={activeItem} />
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <GuruSidebar activeItem={activeItem} setActiveItem={setActiveItem} user={teacherProfile} />
        <SidebarInset className="overflow-y-auto bg-background/85 scroll-smooth">
          <header 
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 pl-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <SidebarTrigger className="-ml-1 text-primary hover:text-primary/80" />
            </div>
            <Separator orientation="vertical" className="mr-2 h-4!" />
            <h1 className="text-lg font-semibold text-primary">{activeItem}</h1>
            <div className="flex-1 h-full" />
            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} className="flex items-center h-full">
              <NotificationIcon />
              <WindowControls />
            </div>
          </header>

          <div className="mx-auto w-full max-w-5xl p-6">
            <div className="space-y-6">
              {renderSection()}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <FloatingFAQ />
    </TooltipProvider>
  )
}
