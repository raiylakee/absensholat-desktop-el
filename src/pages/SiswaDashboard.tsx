import { useState } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WindowControls } from "@/components/titlebar"
import { NotificationIcon } from "@/components/notification-icon"
import { SiswaSidebar } from "@/components/siswa-sidebar"
import { SiswaOverview } from "@/pages/siswa-dashboard/components/SiswaOverview"
import { SiswaScanQR } from "@/pages/siswa-dashboard/components/SiswaScanQR"
import { SiswaProfile } from "@/pages/siswa-dashboard/components/SiswaProfile"
import { SiswaPermitSection } from "@/pages/siswa-dashboard/components/SiswaPermitSection"
import { SettingsSection } from "@/pages/dashboard/components/SettingsSection"
import { Separator } from "@/components/ui/separator"
import { useCurrentProfile } from "@/hooks/use-current-profile"
import { FloatingFAQ } from "@/components/FloatingFAQ"

export default function SiswaDashboard() {
  const [activeItem, setActiveItem] = useState("Dashboard")
  const { profile } = useCurrentProfile()

  const renderContent = () => {
    switch (activeItem) {
      case "Dashboard":
        return <SiswaOverview setActiveItem={setActiveItem} user={profile ?? undefined} />
      case "Pindai QR":
        return <SiswaScanQR />
      case "Izin":
        return <SiswaPermitSection />
      case "Profil":
        return <SiswaProfile user={profile ?? undefined} />
      case "Settings":
        return <SettingsSection />
      default:
        return <SiswaOverview setActiveItem={setActiveItem} user={profile ?? undefined} />
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <SiswaSidebar activeItem={activeItem} setActiveItem={setActiveItem} user={profile ?? undefined} />
        <SidebarInset className="overflow-y-auto bg-muted/20 scroll-smooth">
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
              {renderContent()}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <FloatingFAQ />
    </TooltipProvider>
  )
}
