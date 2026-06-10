export type JadwalRow = {
  hari: string
  jurusan1: string
  jurusan2: string
  id1?: number
  id2?: number
}

export type PrayerCard = {
  id?: number
  nama: string
  waktuMulai: string
  waktuSelesai: string
  jurusan: string[]
  kelas: string[]
  hari?: string[]           // weekdays this prayer repeats on
  tanggalKhusus?: string    // specific date for one-time prayers (yyyy-MM-dd)
}

export type Student = {
  nis: string
  nama: string
  jurusan: string
  kelas: string
  jenisKelamin: "Laki-laki" | "Perempuan"
  agama?: string
  status_akademik?: string
  part?: string
}

export type PresensiRecord = {
  nis: string
  nama: string
  jurusan: string
  kelas: string
  jenisSholat: string
  status: "Hadir" | "Izin" | "Sakit" | "Alpa"
  tanggal?: string
  waktu?: string
  izinDetail?: {
    imageName: string
    imageType: "Surat Sakit" | "Surat Izin" | "Surat Keterangan"
    description: string
  }
}

export type JadwalCell = {
  rowIndex: number
  column: "jurusan1" | "jurusan2"
}
