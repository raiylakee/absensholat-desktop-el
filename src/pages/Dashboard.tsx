import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { WindowControls } from "@/components/titlebar"
import { NotificationIcon } from "@/components/notification-icon"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardOverviewSection } from "@/pages/dashboard/components/DashboardOverviewSection"
import { JadwalSection } from "@/pages/dashboard/components/JadwalSection"
import { DataSiswaSection } from "@/pages/dashboard/components/DataSiswaSection"
import { PresensiSection } from "@/pages/dashboard/components/PresensiSection"
import { ProfileSection } from "@/pages/dashboard/components/ProfileSection"
import { SettingsSection } from "@/pages/dashboard/components/SettingsSection"
import { LaporanSection } from "@/pages/dashboard/components/LaporanSection"
import { ManageSiswaSection } from "@/pages/dashboard/components/ManageSiswaSection"
import { KelolaKelasSection } from "@/pages/dashboard/components/KelolaKelasSection"
import { QRGeneratorSection } from "@/pages/dashboard/components/QRGeneratorSection"
import { UnregisteredStudentsSection } from "@/pages/dashboard/components/UnregisteredStudentsSection"
import { PengajuanIzinSection } from "@/pages/dashboard/components/PengajuanIzinSection"
import { PlaceholderSection } from "@/pages/dashboard/components/PlaceholderSection"
import { useCurrentProfile } from "@/hooks/use-current-profile"

import { FloatingFAQ } from "@/components/FloatingFAQ"

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState("Dashboard")
  const { profile } = useCurrentProfile()

  const renderSection = () => {
    if (activeItem === "Dashboard") return <DashboardOverviewSection />
    if (activeItem === "Jadwal") return <JadwalSection />
    if (activeItem === "Data Siswa") return <DataSiswaSection />
    if (activeItem === "Kelola Siswa") return <ManageSiswaSection />
    if (activeItem === "Kelola Kelas") return <KelolaKelasSection />
    if (activeItem === "Presensi") return <PresensiSection />
    if (activeItem === "Laporan") return <LaporanSection />
    if (activeItem === "QR Code") return <QRGeneratorSection />
    if (activeItem === "Siswa Belum Terdaftar") return <UnregisteredStudentsSection />
    if (activeItem === "Pengajuan Izin") return <PengajuanIzinSection />
    if (activeItem === "Profile") return <ProfileSection user={profile ?? undefined} />
    if (activeItem === "Settings") return <SettingsSection />
    return <PlaceholderSection title={activeItem} />
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <AppSidebar activeItem={activeItem} setActiveItem={setActiveItem} user={profile ?? undefined} />
        <SidebarInset className="overflow-y-auto bg-muted/20 scroll-smooth">
          <header 
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 pl-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <SidebarTrigger className="-ml-1 text-primary hover:text-primary/80" />
            <Separator orientation="vertical" className="mr-2 h-4!" />
            <h1 className="text-lg font-semibold text-primary">{activeItem}</h1>
            <div className="flex-1 h-full" />
            <NotificationIcon />
            <WindowControls />
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
