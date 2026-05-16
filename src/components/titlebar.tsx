import { Minus, Square, X } from "lucide-react";
import { NotificationIcon } from "@/components/notification-icon";
import logoSholat02 from "@/assets/applogo/Logo Sholat-02.png"
import { useLogoAnimation } from "@/lib/logo-animation-context";

export function WindowControls() {
  return (
    <div className="flex h-full shrink-0">
      <button
        className="inline-flex justify-center items-center w-12 h-full hover:bg-muted cursor-pointer transition-colors border-none bg-transparent outline-none"
        onClick={() => window.electronAPI.windowMinimize()}
      >
        <Minus className="size-4 pointer-events-none" />
      </button>
      <button
        className="inline-flex justify-center items-center w-12 h-full hover:bg-muted cursor-pointer transition-colors border-none bg-transparent outline-none"
        onClick={() => window.electronAPI.windowMaximize()}
      >
        <Square className="size-3.5 pointer-events-none" />
      </button>
      <button
        className="inline-flex justify-center items-center w-12 h-full hover:bg-red-500 hover:text-white cursor-pointer transition-colors border-none bg-transparent outline-none"
        onClick={() => window.electronAPI.windowClose()}
      >
        <X className="size-4 pointer-events-none text-foreground" />
      </button>
    </div>
  )
}

interface TitlebarProps {
  hideNotifications?: boolean
}

export function Titlebar({ hideNotifications }: TitlebarProps = {}) {
  const { splashComplete } = useLogoAnimation()

  return (
    <div
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      className="h-10 flex justify-between items-center bg-background border-b select-none z-50 w-full shrink-0"
    >
      <style>{`
        @keyframes logoEnter {
          from {
            opacity: 0;
            transform: translate(calc(50vw - 40px), calc(50vh - 20px)) scale(0.2);
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }

        .titlebar-logo {
          animation: logoEnter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        .titlebar-logo.instant {
          animation: none;
        }
      `}</style>
      <div className="flex items-center pl-3 flex-1 h-full cursor-default gap-2">
        <img 
          src={logoSholat02}
          alt="Logo Sholat"
          className={`w-5 h-5 object-contain pointer-events-none titlebar-logo ${!splashComplete ? "instant" : ""}`}
        />
        <span className="pointer-events-none text-sm font-semibold text-primary">Absensholat</span>
      </div>
      {!hideNotifications && (
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <NotificationIcon />
        </div>
      )}
      <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <WindowControls />
      </div>
    </div>
  );
}
