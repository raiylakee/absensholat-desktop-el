import type { JadwalRow, PrayerCard, PresensiRecord, Student } from "@/pages/dashboard/types"

export const MAJOR_CLASS_MAP: Record<string, string[]> = {
  RPL: ["X RPL 1", "XI RPL 2", "XI RPL 3", "XII RPL 1"],
  TEI: ["X TEI 1", "XI TEI 1", "XI TEI 2", "XII TEI 1"],
  DKV: ["X DKV 2", "XI DKV 1", "XI DKV 2", "XI DKV 3"],
  TKJ: ["X TKJ 1", "XI TKJ 1", "XI TKJ 2"],
  ANM: ["X ANM 1", "XI ANM 1"],
  BC: ["X BC 1", "XI BC 1"],
  TMT: ["X TMT 1", "XI TMT 1"],
  TAV: ["X TAV 1", "XI TAV 1"],
}

export const MAJOR_OPTIONS = Object.keys(MAJOR_CLASS_MAP)
export const GENDER_OPTIONS: Student["jenisKelamin"][] = ["Laki-laki", "Perempuan"]
export const PRAYER_TYPE_OPTIONS: string[] = []
export const PRESENSI_STATUS_OPTIONS: PresensiRecord["status"][] = ["Hadir", "Izin", "Sakit", "Alpha"]
export const IZIN_IMAGE_TYPE_OPTIONS: NonNullable<PresensiRecord["izinDetail"]>["imageType"][] = [
  "Surat Sakit",
  "Surat Izin",
  "Surat Keterangan",
]

export const initialJadwalRows: JadwalRow[] = [
  { hari: "Senin", jurusan1: "RPL", jurusan2: "TEI" },
  { hari: "Selasa", jurusan1: "TKJ", jurusan2: "TAV" },
  { hari: "Rabu", jurusan1: "DKV", jurusan2: "ANM" },
  { hari: "Kamis", jurusan1: "BC", jurusan2: "TMT" },
]

export const initialPrayerCards: PrayerCard[] = [
  { nama: "Dhuha", waktuMulai: "06:30", waktuSelesai: "07:30", jurusan: [], kelas: ["XI RPL 2"] },
  { nama: "Dzuhur", waktuMulai: "12:00", waktuSelesai: "13:00", jurusan: ["RPL", "TEI"], kelas: ["XI TEI 1"] },
]

export const initialStudents: Student[] = [
  { nis: "2401001", nama: "Ahmad Fadli", jurusan: "RPL", kelas: "XI RPL 2", jenisKelamin: "Laki-laki" },
  { nis: "2401002", nama: "Siti Aisyah", jurusan: "TEI", kelas: "XI TEI 1", jenisKelamin: "Perempuan" },
  { nis: "2401003", nama: "Rina Oktavia", jurusan: "DKV", kelas: "XI DKV 2", jenisKelamin: "Perempuan" },
  { nis: "2401004", nama: "Bima Pratama", jurusan: "TKJ", kelas: "XI TKJ 1", jenisKelamin: "Laki-laki" },
]

export const initialPresensiRecords: PresensiRecord[] = [
  { nis: "2401001", nama: "Ahmad Fadli", jurusan: "RPL", kelas: "XI RPL 2", jenisSholat: "Dhuha", status: "Hadir" },
  {
    nis: "2401002",
    nama: "Siti Aisyah",
    jurusan: "TEI",
    kelas: "XI TEI 1",
    jenisSholat: "Dzuhur",
    status: "Izin",
    izinDetail: {
      imageName: "surat-sakit-siti.pdf",
      imageType: "Surat Sakit",
      description:
        "Siswa tidak dapat mengikuti presensi karena sakit demam tinggi dan dianjurkan istirahat oleh dokter. Surat keterangan resmi dari klinik sekolah telah dilampirkan untuk validasi administrasi.",
    },
  },
  { nis: "2401003", nama: "Rina Oktavia", jurusan: "DKV", kelas: "XI DKV 2", jenisSholat: "Dhuha", status: "Sakit" },
  { nis: "2401004", nama: "Bima Pratama", jurusan: "TKJ", kelas: "XI TKJ 1", jenisSholat: "Dhuha", status: "Hadir" },
]
