import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileBarChart2,
  LayoutDashboard,
  QrCode,
  Settings,
  ChevronUp,
  User2,
  UserX,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import logoSholat02 from "@/assets/applogo/Logo Sholat-02.png";
import { logoutSession, type UserProfileData } from "@/lib/auth-session";

const mainMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Jadwal",
    icon: Calendar,
  },
  {
    title: "Data Siswa",
    icon: Users,
  },
  {
    title: "Kelola Siswa",
    icon: Settings,
  },
  {
    title: "Kelola Kelas",
    icon: Settings,
  },
  {
    title: "Presensi",
    icon: BookOpen,
  },
  {
    title: "Pengajuan Izin",
    icon: ClipboardCheck,
  },
  {
    title: "Laporan",
    icon: FileBarChart2,
  },
  {
    title: "QR Code",
    icon: QrCode,
  },
  {
    title: "Siswa Belum Terdaftar",
    icon: UserX,
  },
];

interface AppSidebarProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  user?: UserProfileData;
}

export function AppSidebar({ activeItem, setActiveItem, user }: AppSidebarProps) {
  const navigate = useNavigate();
  const currentUserName = user?.name ?? "Admin User";
  const currentUserEmail = user?.email || user?.username || "admin@example.com";

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader 
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        className="h-14 justify-center p-0 px-2 cursor-default"
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none!">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden shrink-0 bg-primary/10">
                <img src={logoSholat02} alt="Absensholat" className="size-5 object-contain" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                <span className="font-semibold text-sidebar-foreground truncate">Absensholat</span>
                <span className="text-[10px] text-sidebar-foreground/70 truncate italic">Portal Administrator</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title} 
                    isActive={activeItem === item.title}
                    onClick={() => setActiveItem(item.title)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <User2 className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-medium text-sidebar-foreground">{currentUserName}</span>
                      <span className="text-xs text-sidebar-foreground/70">{currentUserEmail}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={4}
                className="w-56"
              >
                <DropdownMenuItem onClick={() => setActiveItem("Profile")}>
                  <User2 className="mr-2 size-4" />
                  <span>Akun</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setActiveItem("Settings")}>
                  <Settings className="mr-2 size-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
