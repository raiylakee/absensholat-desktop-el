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

const FAQ_ADMIN: FAQItem[] = [
  {
    question: "Bagaimana cara menambahkan siswa baru?",
    answer: "Buka menu 'Kelola Siswa' lalu klik tombol 'Tambah Siswa'. Isi data siswa seperti NIS, nama, kelas, dan email. Setelah disimpan, siswa akan menerima kredensial untuk login."
  },
  {
    question: "Bagaimana cara membuat kelas baru?",
    answer: "Masuk ke menu 'Kelola Kelas' dan klik 'Tambah Kelas'. Masukkan nama kelas dan pilih wali kelas dari daftar guru yang tersedia, lalu simpan."
  },
  {
    question: "Bagaimana cara mengelola guru dan wali kelas?",
    answer: "Buka menu 'Kelola Guru' untuk melihat, menambah, atau mengedit data guru. Anda dapat menetapkan guru sebagai wali kelas dengan memilih kelas yang diampu pada data guru."
  },
  {
    question: "Bagaimana cara membuat QR Code untuk absensi?",
    answer: "Buka menu 'QR Code', pilih jadwal dan jenis sholat, lalu klik 'Generate QR Code'. QR Code akan ditampilkan dan dapat diproyeksikan atau dicetak untuk dipindai oleh siswa."
  },
  {
    question: "Bagaimana cara melihat laporan presensi?",
    answer: "Buka menu 'Laporan' dan pilih rentang tanggal serta kelas yang ingin ditampilkan. Anda dapat melihat ringkasan kehadiran dan mengunduh laporan dalam format PDF atau Excel."
  },
  {
    question: "Bagaimana cara menyetujui pengajuan izin?",
    answer: "Buka menu 'Pengajuan Izin', pilih pengajuan yang ingin ditinjau, lalu klik 'Setujui' atau 'Tolak'. Status pengajuan akan otomatis diperbarui dan siswa akan menerima notifikasi."
  },
  {
    question: "Bagaimana cara mengelola jadwal?",
    answer: "Buka menu 'Jadwal' untuk menambah atau mengedit waktu sholat. Anda dapat mengatur waktu mulai, waktu akhir, dan batas keterlambatan untuk setiap sesi absensi."
  },
  {
    question: "Apa itu fitur Siswa Belum Terdaftar?",
    answer: "Fitur ini menampilkan daftar siswa yang telah melakukan scan QR tetapi belum terdaftar di sistem. Anda dapat langsung mendaftarkan mereka melalui menu ini."
  },
  {
    question: "Bagaimana cara mengelola perangkat siswa?",
    answer: "Buka menu 'Perangkat Siswa' untuk melihat perangkat yang digunakan siswa untuk absensi. Anda dapat membatasi atau menghapus perangkat jika diperlukan."
  },
  {
    question: "Siapa yang harus saya hubungi untuk bantuan teknis?",
    answer: "Jika Anda mengalami kendala aplikasi, silakan hubungi tim IT Support melalui kontak yang tertera di pengaturan atau hubungi pengembang aplikasi."
  },
]

const FAQ_SISWA: FAQItem[] = [
  {
    question: "Bagaimana cara melakukan absensi?",
    answer: "Buka menu 'Pindai QR' dan arahkan kamera ke kode QR yang ditampilkan oleh guru atau admin. Pastikan Anda berada di lokasi sekolah dan waktu absensi masih aktif."
  },
  {
    question: "Kenapa saya tidak bisa melakukan absensi?",
    answer: "Pastikan kamera Anda berfungsi dengan baik, Anda berada dalam jangkauan lokasi sekolah, dan waktu absensi masih aktif. Jika masalah berlanjut, hubungi admin atau wali kelas."
  },
  {
    question: "Bagaimana cara mengajukan izin?",
    answer: "Buka menu 'Izin', klik tombol 'Tambah Izin', lalu isi jenis izin (Sakit/Izin), alasan, dan tanggal. Admin atau wali kelas akan memverifikasi pengajuan Anda."
  },
  {
    question: "Bagaimana cara melihat riwayat presensi saya?",
    answer: "Buka menu 'Beranda' untuk melihat ringkasan kehadiran Anda, termasuk jumlah hadir, izin, sakit, dan alpa. Detail presensi dapat dilihat di bagian ringkasan pada dashboard."
  },
  {
    question: "Apa yang harus saya lakukan jika lupa kata sandi?",
    answer: "Klik 'Lupa kata sandi?' di halaman masuk. Masukkan NIS dan email Anda untuk menerima kode OTP, lalu ikuti langkah-langkah untuk mengatur ulang kata sandi."
  },
  {
    question: "Bagaimana cara mengganti email atau NIS?",
    answer: "Perubahan data pokok seperti NIS dan Email hanya dapat dilakukan oleh Admin Sekolah. Silakan hubungi wali kelas atau bagian TU untuk meminta perubahan data."
  },
  {
    question: "Siapa yang harus saya hubungi untuk bantuan teknis?",
    answer: "Jika Anda mengalami kendala aplikasi, silakan hubungi wali kelas atau admin sekolah untuk mendapatkan bantuan lebih lanjut."
  },
]

const FAQ_GURU: FAQItem[] = [
  {
    question: "Bagaimana cara melihat presensi kelas yang saya ampu?",
    answer: "Buka menu 'Presensi' untuk melihat daftar kehadiran siswa di kelas Anda. Data akan otomatis difilter berdasarkan kelas yang Anda ampu sebagai wali kelas."
  },
  {
    question: "Bagaimana cara menyetujui pengajuan izin siswa?",
    answer: "Buka menu 'Pengajuan Izin', pilih pengajuan dari siswa di kelas Anda, lalu klik 'Setujui' atau 'Tolak'. Status pengajuan akan otomatis diperbarui dan siswa akan menerima notifikasi."
  },
  {
    question: "Bagaimana cara melihat laporan presensi kelas?",
    answer: "Buka menu 'Laporan' untuk melihat ringkasan kehadiran siswa di kelas Anda. Pilih rentang tanggal yang diinginkan untuk melihat data presensi secara detail."
  },
  {
    question: "Bagaimana cara melihat jadwal?",
    answer: "Buka menu 'Jadwal' untuk melihat jadwal waktu sholat yang telah ditentukan oleh admin. Sebagai guru, Anda dapat melihat jadwal namun tidak dapat mengubahnya."
  },
  {
    question: "Apa itu fitur Siswa Belum Terdaftar?",
    answer: "Fitur ini menampilkan daftar siswa di kelas Anda yang telah melakukan scan QR tetapi belum terdaftar di sistem. Anda dapat menghubungi admin untuk mendaftarkan mereka."
  },
  {
    question: "Apa yang harus saya lakukan jika lupa kata sandi?",
    answer: "Klik 'Lupa kata sandi?' di halaman masuk. Masukkan NIP/NUPTK dan email Anda untuk menerima kode OTP, lalu ikuti langkah-langkah untuk mengatur ulang kata sandi."
  },
  {
    question: "Bagaimana cara mengedit profil saya?",
    answer: "Buka menu 'Profil' melalui ikon pengguna di sidebar, lalu klik ikon edit untuk memperbarui foto, nama, atau informasi kontak Anda. Perubahan data pokok memerlukan persetujuan admin."
  },
  {
    question: "Siapa yang harus saya hubungi untuk bantuan teknis?",
    answer: "Jika Anda mengalami kendala aplikasi, silakan hubungi admin sekolah atau tim IT Support untuk mendapatkan bantuan lebih lanjut."
  },
]

type FAQRole = "admin" | "siswa" | "guru"

function getFAQData(role: FAQRole): FAQItem[] {
  switch (role) {
    case "admin":
      return FAQ_ADMIN
    case "siswa":
      return FAQ_SISWA
    case "guru":
      return FAQ_GURU
    default:
      return FAQ_SISWA
  }
}

export function FloatingFAQ({ role = "siswa" }: { role?: FAQRole }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const faqData = getFAQData(role)

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqData
    const query = searchQuery.toLowerCase()
    return faqData.filter(
      item => 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query)
    )
  }, [searchQuery, faqData])

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

                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Anda bisa menghubungi layanan informasi resmi SMK Negeri 2 Singosari melalui kontak berikut:
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Telepon/Faks: (0341) 4345127
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Email: smkn2.singosari@yahoo.co.id atau singosarismkn2@gmail.com
                      </p>
                    </div>
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
