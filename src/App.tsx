import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { PageTransition } from "@/components/page-transition"
import Dashboard from "@/pages/Dashboard"
import SiswaDashboard from "@/pages/SiswaDashboard"
import GuruDashboard from "@/pages/GuruDashboard"
import Login from "@/pages/auth/Login"
import Register from "@/pages/auth/Register"
import RequestReset from "@/pages/auth/RequestReset"
import VerifyOtp from "@/pages/auth/VerifyOtp"
import ResetPassword from "@/pages/auth/ResetPassword"
import VerifyAccount from "@/pages/auth/VerifyAccount"
import { ResizeHandle } from "@/components/resize-handle"
import { Toaster } from "@/components/ui/sonner"
import { NotificationProvider } from "@/lib/notification-store"
import { AutoLoginGuard } from "@/components/AutoLoginGuard"
import inorasi from "@/assets/inorasi.png"

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/siswa-dashboard" element={<PageTransition><SiswaDashboard /></PageTransition>} />
        <Route path="/guru-dashboard" element={<PageTransition><GuruDashboard /></PageTransition>} />
        <Route path="/login" element={<AutoLoginGuard><PageTransition><Login /></PageTransition></AutoLoginGuard>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><RequestReset /></PageTransition>} />
        <Route path="/request-password-reset" element={<PageTransition><RequestReset /></PageTransition>} />
        <Route path="/verify-otp" element={<PageTransition><VerifyOtp /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/verify-account" element={<PageTransition><VerifyAccount /></PageTransition>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <div className="min-h-screen w-screen relative overflow-hidden">
      <ResizeHandle />
      {/* Background image - visible on all pages */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${inorasi})`,
          backgroundSize: "contain",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <NotificationProvider>
        <HashRouter>
          <div className="relative z-10 min-h-screen">
            <AnimatedRoutes />
            <Toaster />
          </div>
        </HashRouter>
      </NotificationProvider>
    </div>
  )
}

export default App
