import { useState, useMemo } from "react"
import { HelpCircle, Search, X, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"

interface FAQItem {
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Bagaimana cara melakukan absensi?",
    answer: "Anda dapat melakukan absensi dengan memindai kode QR yang ditampilkan di proyektor atau meja piket menggunakan aplikasi mobile, atau melalui fitur absensi manual jika diizinkan oleh admin."
  },
  {
    question: "Apa yang harus saya lakukan jika lupa kata sandi?",
    answer: "Klik 'Lupa kata sandi?' di halaman login. Masukkan NIS dan email Anda untuk menerima kode OTP, lalu ikuti langkah-langkah untuk mengatur ulang kata sandi."
  },
  {
    question: "Bagaimana cara mengajukan izin?",
    answer: "Buka menu 'Pengajuan Izin' di dashboard Anda, klik tombol 'Tambah Izin', isi detail alasan dan tanggal, lalu kirim. Admin atau Wali Kelas akan memverifikasi pengajuan Anda."
  },
  {
    question: "Kenapa saya tidak bisa melakukan absensi?",
    answer: "Pastikan Anda berada dalam jangkauan lokasi sekolah dan waktu absensi masih aktif. Jika masalah berlanjut, hubungi Admin untuk pengecekan status akun atau perangkat Anda."
  },
  {
    question: "Bagaimana cara mengganti email atau NIS?",
    answer: "Perubahan data pokok seperti NIS dan Email hanya dapat dilakukan melalui Admin Sekolah. Silakan hubungi bagian TU atau IT Support sekolah."
  },
  {
    question: "Apa fungsi dari fitur Riwayat Presensi?",
    answer: "Fitur ini memungkinkan Anda untuk melihat rekaman kehadiran Anda di masa lalu, termasuk status kehadiran (Hadir, Izin, Sakit, Alpa) dan waktu Anda melakukan scan."
  },
  {
    question: "Siapa yang harus saya hubungi untuk bantuan teknis?",
    answer: "Jika Anda mengalami kendala aplikasi, silakan hubungi tim IT Support di ruang IT atau melalui kontak Admin yang tertera di papan pengumuman sekolah."
  }
]

export function FloatingFAQ() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA
    const query = searchQuery.toLowerCase()
    return FAQ_DATA.filter(
      item => 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96"
          >
            <Card className="border shadow-2xl overflow-hidden backdrop-blur-sm bg-background/95">
              <CardHeader className="p-4 border-b bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" />
                    Pusat Bantuan
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setIsOpen(false)}>
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari pertanyaan..."
                    className="pl-9 h-9 bg-background/50 focus-visible:ring-primary/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {filteredFaqs.length > 0 ? (
                      filteredFaqs.map((faq, index) => (
                        <div 
                          key={index} 
                          className="border rounded-lg overflow-hidden transition-colors hover:border-primary/30"
                        >
                          <button
                            className="w-full p-3 text-left flex items-center justify-between gap-3 font-medium text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                          >
                            <span>{faq.question}</span>
                            {expandedIndex === index ? (
                              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedIndex === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 text-xs leading-relaxed text-muted-foreground border-t bg-background">
                                  {faq.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-muted-foreground">
                        <p className="text-sm">Pertanyaan tidak ditemukan.</p>
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className="size-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
        onClick={() => setIsOpen(!isOpen)}
      >
        <HelpCircle className="size-7" />
      </Button>
    </div>
  )
}
