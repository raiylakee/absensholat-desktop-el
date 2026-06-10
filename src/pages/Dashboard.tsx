import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { WindowControls } from "@/components/titlebar"
import { NotificationIcon } from "@/components/notification-icon"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardOverviewSection } from "@/pages/dashboard/components/DashboardOverviewSection"
import { JadwalSection } from "@/pages/dashboard/components/JadwalSection"
import { PresensiSection } from "@/pages/dashboard/components/PresensiSection"
import { ProfileSection } from "@/pages/dashboard/components/ProfileSection"
import { SettingsSection } from "@/pages/dashboard/components/SettingsSection"
import { LaporanSection } from "@/pages/dashboard/components/LaporanSection"
import { ManageSiswaSection } from "@/pages/dashboard/components/ManageSiswaSection"
import { KelolaKelasSection } from "@/pages/dashboard/components/KelolaKelasSection"
import { KelolaGuruSection } from "@/pages/dashboard/components/KelolaGuruSection"
import { QRGeneratorSection } from "@/pages/dashboard/components/QRGeneratorSection"
import { UnregisteredStudentsSection } from "@/pages/dashboard/components/UnregisteredStudentsSection"
import { PengajuanIzinSection } from "@/pages/dashboard/components/PengajuanIzinSection"
import { SiswaDevicesSection } from "@/pages/dashboard/components/SiswaDevicesSection"
import { PlaceholderSection } from "@/pages/dashboard/components/PlaceholderSection"
import { useCurrentProfile } from "@/hooks/use-current-profile"

import { FloatingFAQ } from "@/components/FloatingFAQ"

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState("Beranda")
  const { profile } = useCurrentProfile()

  const renderSection = () => {
    if (activeItem === "Beranda") return <DashboardOverviewSection onNavigate={setActiveItem} />
    if (activeItem === "Jadwal") return <JadwalSection />
    if (activeItem === "Kelola Siswa") return <ManageSiswaSection />
    if (activeItem === "Kelola Kelas") return <KelolaKelasSection />
    if (activeItem === "Kelola Guru") return <KelolaGuruSection />
    if (activeItem === "Presensi") return <PresensiSection />
    if (activeItem === "Laporan") return <LaporanSection />
    if (activeItem === "QR Code") return <QRGeneratorSection />
    if (activeItem === "Siswa Belum Terdaftar") return <UnregisteredStudentsSection />
    if (activeItem === "Pengajuan Izin") return <PengajuanIzinSection />
    if (activeItem === "Perangkat Siswa") return <SiswaDevicesSection />
    if (activeItem === "Profile") return <ProfileSection user={profile ?? undefined} />
    if (activeItem === "Settings") return <SettingsSection />
    return <PlaceholderSection title={activeItem} />
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <AppSidebar activeItem={activeItem} setActiveItem={setActiveItem} user={profile ?? undefined} />
        <SidebarInset className="flex flex-col overflow-hidden bg-background/85">
          <header
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 pl-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
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

          <div className="mx-auto w-full max-w-5xl p-6 flex-1 overflow-y-auto scroll-smooth min-h-0">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeItem}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-6"
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <FloatingFAQ role="admin" />
    </TooltipProvider>
  )
}
