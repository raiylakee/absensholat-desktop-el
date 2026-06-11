import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PresensiTab } from "./PresensiTab"
import { HalanganTab } from "@/components/halangan-qr/HalanganTab"

export function QRGeneratorSection() {
  const [activeTab, setActiveTab] = useState<"presensi" | "halangan">("presensi")

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border bg-muted p-1">
        <Button
          variant={activeTab === "presensi" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setActiveTab("presensi")}
        >
          Presensi Salat
        </Button>
        <Button
          variant={activeTab === "halangan" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setActiveTab("halangan")}
        >
          Halangan
        </Button>
      </div>

      {activeTab === "presensi" ? <PresensiTab /> : <HalanganTab />}
    </div>
  )
}
