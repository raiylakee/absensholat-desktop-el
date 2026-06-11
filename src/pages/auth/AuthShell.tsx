import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Titlebar } from "@/components/titlebar"
import { useLogo } from "@/lib/logo-context"
import inorasi from "@/assets/inorasi.png"
import ino2 from "@/assets/INO_2.png"
import rasi2 from "@/assets/RASI_2.png"

type AuthShellProps = {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  const { logoSrc } = useLogo()
  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background relative"
      style={{
        backgroundImage: `url(${inorasi})`,
        backgroundSize: "contain",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Fade overlay to make background more subtle */}
      <div className="absolute inset-0 bg-background/85 pointer-events-none" />

      <Titlebar hideNotifications={true} />

      <div className="flex flex-1 items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md relative">
          {/* Decorative INO_2 - left side of card, on top, no fade */}
          <motion.div
            className="absolute -left-64 inset-y-0 flex items-center pointer-events-none z-20"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <img
              src={ino2}
              alt="Decorative INO"
              className="max-h-[280px] object-contain"
            />
          </motion.div>

          {/* Decorative RASI_2 - right side of card, on top, no fade */}
          <motion.div
            className="absolute -right-64 inset-y-0 flex items-center pointer-events-none z-20"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <img
              src={rasi2}
              alt="Decorative RASI"
              className="max-h-[280px] object-contain"
            />
          </motion.div>

          {/* Login card */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mb-8 flex flex-col items-center gap-2">
              <motion.div
                className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <img
                  src={logoSrc}
                  alt="Logo Salat"
                  className="w-12 h-12 object-contain"
                />
              </motion.div>
              <motion.h1
                className="text-2xl font-bold tracking-tight mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Presensi Salat
              </motion.h1>
              <motion.p
                className="text-sm text-muted-foreground font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Sistem Absensi Terpadu
              </motion.p>
            </div>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
