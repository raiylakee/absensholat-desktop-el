import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileBarChart2,
  LayoutDashboard,
  Settings,
  ChevronUp,
  User2,
  UserX,
  LogOut,
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

const guruMenuItems = [
  {
    title: "Beranda",
    icon: LayoutDashboard,
  },
  {
    title: "Jadwal",
    icon: Calendar,
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
    title: "Siswa Belum Terdaftar",
    icon: UserX,
  },
];

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
} as const;

const menuItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: 0.05 * i, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

interface GuruSidebarProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  user?: UserProfileData;
}

export function GuruSidebar({ activeItem, setActiveItem, user }: GuruSidebarProps) {
  const navigate = useNavigate();
  const currentUserName = user?.name ?? "Bambang Susilo, S.Pd";
  const currentUserRole = user?.role ?? "Wali Kelas XI RPL 2";
  const avatarInitials = currentUserName.trim().split(/\s+/).filter(Boolean).length > 1
    ? `${currentUserName.trim().split(/\s+/)[0][0]}${currentUserName.trim().split(/\s+/)[1][0]}`.toUpperCase()
    : currentUserName.slice(0, 2).toUpperCase();

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
    <motion.aside
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      className="flex-shrink-0 overflow-hidden"
    >
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
                <span className="text-[10px] text-sidebar-foreground/70 truncate italic">Portal Wali Kelas</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {guruMenuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={menuItemVariants}
                >
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip={item.title} 
                    isActive={activeItem === item.title}
                    onClick={() => setActiveItem(item.title)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                </motion.div>
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
                    <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {avatarInitials}
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-medium text-sm text-sidebar-foreground">{currentUserName}</span>
                      <span className="text-[10px] text-sidebar-foreground/70">{currentUserRole}</span>
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
                  <span>Profil</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setActiveItem("Settings")}>
                  <Settings className="mr-2 size-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4 text-red-500" />
                  <span className="text-red-500">Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </motion.aside>
  );
}
