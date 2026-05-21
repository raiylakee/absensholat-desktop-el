import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
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
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/siswa-dashboard" element={<SiswaDashboard />} />
              <Route path="/guru-dashboard" element={<GuruDashboard />} />
              <Route path="/login" element={<AutoLoginGuard><Login /></AutoLoginGuard>} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<RequestReset />} />
              <Route path="/request-password-reset" element={<RequestReset />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-account" element={<VerifyAccount />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster />
          </div>
        </HashRouter>
      </NotificationProvider>
    </div>
  )
}

export default App
