# Implementation Plan: Download & Print Actions

## Overview

Implementasi fitur unduh dan cetak secara menyeluruh di seluruh aplikasi Absensholat Desktop. Pendekatan dimulai dari membangun utilitas inti (`generateExportFilename`, `useDownloadAction`, `usePrintAction`) dan komponen bersama (`PrintHeader`, `BuktiFotoPreview`), kemudian mengintegrasikannya ke setiap section yang membutuhkan, diikuti oleh CSS print layout, dan diakhiri dengan pengujian.

## Tasks

- [x] 1. Instal dependensi dan buat utilitas inti
  - [x] 1.1 Instal `fast-check` sebagai dev dependency
    - Jalankan `npm install --save-dev fast-check` untuk menambahkan library property-based testing
    - Verifikasi entri `fast-check` muncul di `devDependencies` pada `package.json`
    - _Requirements: Testing Strategy (design.md)_

  - [x] 1.2 Buat `src/lib/export-filename.ts` dengan fungsi `generateExportFilename`
    - Definisikan tipe `ExportDataType`, `ExportFormat`, dan `ExportFilenameOptions`
    - Implementasikan fungsi murni `generateExportFilename(options: ExportFilenameOptions): string`
    - Aturan: semua karakter lowercase, spasi dan karakter non-alfanumerik (kecuali `-` dan `.`) diganti `-`, tanggal selalu `YYYY-MM-DD`, filter kosong/undefined → `"semua"`, panjang maksimum 255 karakter (potong sebelum ekstensi)
    - Contoh output: `laporan-absensi-semua-2025-01-15.xlsx`, `data-siswa-rpl-2025-01-15.csv`, `qr-presensi-2025-01-15-0930.png`, `riwayat-ahmad-budi-12345-2025-01-15.csv`, `daftar-guru-2025-01-15.csv`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x]* 1.3 Tulis unit tests untuk `generateExportFilename`
    - File: `src/__tests__/lib/export-filename.test.ts`
    - Test format output untuk setiap `dataType`
    - Test penanganan karakter spesial dalam nama siswa/filter (spasi, tanda baca, karakter unicode)
    - Test pemotongan nama file yang melebihi 255 karakter
    - Test nilai default filter `"semua"` saat filter tidak diberikan
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x]* 1.4 Tulis property-based tests untuk `generateExportFilename`
    - File: `src/__tests__/lib/export-filename.property.test.ts`
    - **Property 1: Filename Character Safety** — untuk semua input valid, output hanya mengandung `[a-z0-9.\-]` dan panjang ≤ 255
    - **Validates: Requirements 14.1**
    - **Property 2: Filename Always Contains Date** — untuk semua input valid, output mengandung substring yang cocok dengan `\d{4}-\d{2}-\d{2}`
    - **Validates: Requirements 14.2**
    - **Property 3: Filename Extension Matches Format** — untuk semua input valid dengan format tertentu, output berakhir dengan ekstensi yang sesuai
    - **Validates: Requirements 14.4**
    - **Property 4: Filename Uniqueness Across Inputs** — untuk dua input yang berbeda di `dataType`, `date`, atau `filter`, output berbeda
    - **Validates: Requirements 14.3**

- [x] 2. Buat custom hooks `useDownloadAction` dan `usePrintAction`
  - [x] 2.1 Buat `src/hooks/use-download-action.ts`
    - Definisikan interface `DownloadConfig` dan `UseDownloadActionReturn`
    - Implementasikan hook `useDownloadAction()` yang mengelola state `isDownloading`
    - Alur: `generateExportFilename` → `showSaveDialog` → jika null return → `setIsDownloading(true)` → `config.fetchData()` → `writeFile` → `notify` sukses → `setIsDownloading(false)`
    - Tangani error dari `fetchData` dan `writeFile`: `notify("Gagal...", "error")` dan `setIsDownloading(false)`
    - Gunakan `window.electronAPI.showSaveDialog`, `window.electronAPI.writeFile`, dan `notify` dari `@/lib/notify`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 3.1, 3.2, 7.2, 9.2, 9.3, 13.2_

  - [x]* 2.2 Tulis unit tests untuk `useDownloadAction`
    - File: `src/__tests__/hooks/use-download-action.test.ts`
    - Skenario sukses: mock `showSaveDialog` → path, mock `fetchData` → data, assert `writeFile` dipanggil dengan data yang benar
    - Skenario batal: mock `showSaveDialog` → null, assert `writeFile` tidak dipanggil dan `isDownloading` tetap false
    - Skenario error `fetchData`: mock `fetchData` → throw, assert `notify("error")` dipanggil dan `isDownloading` kembali false
    - Skenario error `writeFile`: mock `writeFile` → throw, assert `notify("error")` dipanggil
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x]* 2.3 Tulis property-based test untuk `useDownloadAction`
    - File: `src/__tests__/hooks/use-download-action.property.test.ts`
    - **Property 6: Error Notification on Any Download Failure** — untuk sembarang error yang dilempar `fetchData`, hook HARUS memanggil `notify` dengan severity `'error'` dan `isDownloading` kembali ke `false`
    - **Validates: Requirements 1.6, 7.4, 9.4, 11.6, 13.4**

  - [x] 2.4 Buat `src/hooks/use-print-action.ts`
    - Definisikan interface `UsePrintActionReturn`
    - Implementasikan hook `usePrintAction()` yang mengekspos fungsi `print()`
    - Alur: tambahkan class `printing` ke `document.body` → `window.print()` → hapus class `printing`
    - Tangani exception dari `window.print()`: `notify("Gagal membuka dialog cetak: ...", "error")`
    - _Requirements: 2.2, 2.3, 4.1, 4.2, 6.3, 6.4, 8.3, 8.4, 10.3, 10.4, 12.2, 12.3_

- [x] 3. Buat komponen bersama `PrintHeader` dan `BuktiFotoPreview`
  - [x] 3.1 Buat `src/components/print-header.tsx`
    - Definisikan interface `PrintHeaderProps` dengan `title`, `subtitle?`, `filters?`, `studentName?`, `nis?`, `printDate?`
    - Komponen hanya terlihat saat `@media print` aktif (class `print:block hidden`)
    - Tampilkan: nama sekolah (dari konstanta), judul laporan, filter aktif (atau "Semua"), nama siswa + NIS (jika ada), tanggal cetak format `DD MMMM YYYY`
    - Gunakan `date-fns` untuk format tanggal (sudah tersedia di project)
    - _Requirements: 2.5, 4.4, 8.5, 10.5, 12.4_

  - [x]* 3.2 Tulis unit tests untuk `PrintHeader`
    - File: `src/__tests__/components/PrintHeader.test.tsx`
    - Render dengan berbagai kombinasi props, assert konten yang diharapkan ada di output
    - Test render dengan `filters` map berisi beberapa entri
    - Test render dengan `studentName` dan `nis`
    - Test render tanpa props opsional (fallback ke "Semua")
    - _Requirements: 2.5, 4.4, 8.5, 10.5, 12.4_

  - [x]* 3.3 Tulis property-based tests untuk `PrintHeader`
    - File: `src/__tests__/components/PrintHeader.property.test.tsx`
    - **Property 9: Print Header Renders Student Identity** — untuk sembarang `studentName` dan `nis` yang non-empty, komponen HARUS merender keduanya dalam output
    - **Validates: Requirements 8.5, 10.5, 12.4**
    - **Property 10: Print Header Renders Active Filters** — untuk sembarang `filters` map yang non-empty, komponen HARUS merender setiap nilai filter dalam output
    - **Validates: Requirements 4.4**

  - [x] 3.4 Buat `src/components/bukti-foto-preview.tsx`
    - Definisikan interface `BuktiFotoPreviewProps` dengan `url`, `fileName?`, `onDownload`, `isDownloading?`
    - Deteksi tipe file dari URL: `.jpg/.jpeg/.png/.gif/.webp` → `<img>` preview; `.pdf` → ikon PDF + nama file; lainnya → ikon file generik + nama file
    - Tampilkan tombol unduh dengan ikon `Download` dari `lucide-react`
    - Nonaktifkan tombol saat `isDownloading === true`
    - _Requirements: 11.3, 11.4, 11.5_

  - [x]* 3.5 Tulis unit tests untuk `BuktiFotoPreview`
    - File: `src/__tests__/components/BuktiFotoPreview.test.tsx`
    - Render dengan URL gambar (`.jpg`, `.png`, `.webp`), assert `<img>` dirender
    - Render dengan URL PDF, assert ikon PDF dirender
    - Render dengan URL file lain, assert ikon generik dirender
    - Test tombol unduh disabled saat `isDownloading === true`
    - _Requirements: 11.3, 11.4, 11.5_

  - [x]* 3.6 Tulis property-based test untuk `BuktiFotoPreview`
    - File: `src/__tests__/components/BuktiFotoPreview.property.test.tsx`
    - **Property 11: Bukti File Type Detection** — untuk sembarang URL yang berakhir dengan ekstensi gambar, komponen HARUS merender `<img>`; untuk `.pdf` merender ikon PDF; untuk lainnya merender ikon generik
    - **Validates: Requirements 11.3, 11.4, 11.5**

- [x] 4. Checkpoint — Pastikan semua tests inti lulus
  - Jalankan `npm test` dan pastikan semua test di task 1–3 lulus
  - Tanyakan kepada user jika ada pertanyaan sebelum melanjutkan ke integrasi komponen

- [x] 5. Tambahkan CSS print layout global
  - [x] 5.1 Tambahkan aturan `@media print` ke `src/index.css`
    - Sembunyikan elemen yang tidak relevan saat cetak: sidebar, titlebar, tombol aksi, header navigasi, kontrol pagination, notifikasi, FAB
    - Gunakan selector berbasis class yang sudah ada di komponen (misalnya `[data-sidebar]`, `.titlebar`, tombol dengan class tertentu)
    - Tambahkan class `printing` ke body sebagai trigger untuk `usePrintAction`
    - Format tabel agar semua kolom terlihat dalam lebar halaman A4 (`@page { size: A4; margin: 1cm; }`)
    - Format QR Code agar berukuran minimum 150×150 mm dan terpusat saat cetak
    - _Requirements: 2.4, 2.5, 2.6, 4.3, 4.4, 6.5, 8.5, 8.6, 10.5, 12.4_

- [x] 6. Integrasi ke `LaporanSection` (Admin & Guru)
  - [x] 6.1 Refaktor logika download di `LaporanSection` menggunakan `useDownloadAction`
    - Ganti implementasi `handleDownloadReport` yang ada dengan `useDownloadAction` hook
    - Gunakan `generateExportFilename` untuk menghasilkan `defaultPath` pada save dialog
    - Pastikan filter jurusan/kelas aktif diteruskan sebagai parameter ke `exportReport` (Property 8)
    - Validasi rentang kustom: nonaktifkan tombol konfirmasi jika `downloadRange === 'custom'` dan salah satu tanggal null/kosong (Property 5)
    - Tambahkan pesan validasi inline di bawah field tanggal saat kondisi invalid
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 6.2 Tambahkan tombol "Cetak" ke `LaporanSection` menggunakan `usePrintAction`
    - Tambahkan tombol `<Printer>` di sebelah tombol "Unduh Laporan" di `CardHeader`
    - Nonaktifkan tombol cetak saat `records.length === 0` atau `isLoading === true`
    - Tambahkan `<Tooltip>` dari shadcn/ui pada tombol disabled yang menjelaskan kondisi
    - Tambahkan `<PrintHeader>` dengan title "Laporan Absensi" dan filter aktif
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 7. Integrasi ke `ManageSiswaSection` (Admin)
  - [x] 7.1 Tambahkan tombol "Unduh Data Siswa" ke `ManageSiswaSection`
    - Tambahkan tombol `<Download>` di `CardHeader` menggunakan `useDownloadAction`
    - Gunakan `generateExportFilename` dengan `dataType: 'data-siswa'` dan filter jurusan aktif
    - `fetchData`: serialize data siswa yang sedang ditampilkan ke CSV menggunakan `arrayToCsv` helper
    - Nonaktifkan tombol saat tidak ada data; tampilkan `notify("warning")` jika diklik saat kosong
    - Tambahkan `<Tooltip>` pada tombol disabled
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 15.1, 15.3, 15.4, 15.5_

  - [x] 7.2 Tambahkan tombol "Cetak" ke `ManageSiswaSection`
    - Tambahkan tombol `<Printer>` di `CardHeader` menggunakan `usePrintAction`
    - Nonaktifkan tombol saat tidak ada data; tambahkan `<Tooltip>` pada tombol disabled
    - Tambahkan `<PrintHeader>` dengan title "Daftar Siswa" dan filter aktif (jurusan, kelas, jenis kelamin, agama)
    - Sembunyikan kolom checkbox dan kolom aksi saat `@media print` (tambahkan class `print:hidden`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 15.2, 15.3, 15.4, 15.5_

- [x] 8. Integrasi ke `QRGeneratorSection` (Admin)
  - [x] 8.1 Tambahkan fungsi helper `svgElementToPngBase64` di `QRGeneratorSection` atau file utilitas
    - Implementasikan konversi SVG ke PNG menggunakan Canvas API browser
    - Alur: `XMLSerializer` → serialize SVG → buat `Image` dari data URL → gambar ke `<canvas>` ukuran 512×512 → `canvas.toDataURL('image/png')` → strip prefix data URL → return base64 string
    - Tangani error konversi: lempar Error dengan pesan yang jelas
    - _Requirements: 5.2, 5.3_

  - [x] 8.2 Tambahkan tombol "Unduh QR" ke `QRGeneratorSection`
    - Tambahkan tombol `<Download>` menggunakan `useDownloadAction`
    - `fetchData`: panggil `svgElementToPngBase64` pada elemen SVG QR Code yang dirender
    - Gunakan `generateExportFilename` dengan `dataType: 'qr-presensi'` dan format `'png'`
    - Nonaktifkan tombol saat QR Code belum digenerate; tambahkan `<Tooltip>` yang menjelaskan kondisi
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 15.1, 15.4, 15.5_

  - [x] 8.3 Tambahkan tombol "Cetak QR" ke `QRGeneratorSection`
    - Tambahkan tombol `<Printer>` menggunakan `usePrintAction`
    - Nonaktifkan tombol saat QR Code belum digenerate; tambahkan `<Tooltip>`
    - Tambahkan `<PrintHeader>` khusus QR yang menampilkan nama sekolah dan instruksi penggunaan (≤ 2 baris)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 15.2, 15.4, 15.5_

- [x] 9. Integrasi ke `AttendanceHistoryPanel` (Admin & Guru)
  - [x] 9.1 Tambahkan tombol "Unduh Riwayat" ke `AttendanceHistoryPanel`
    - Tambahkan tombol `<Download>` di header panel menggunakan `useDownloadAction`
    - `fetchData`: serialize data riwayat kehadiran ke CSV menggunakan `arrayToCsv`
    - Gunakan `generateExportFilename` dengan `dataType: 'riwayat-kehadiran'`, `studentName`, dan `nis`
    - Nonaktifkan tombol saat `isLoading === true`; tambahkan `<Tooltip>` yang menjelaskan kondisi
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 15.1, 15.4, 15.5_

  - [x] 9.2 Tambahkan tombol "Cetak Riwayat" ke `AttendanceHistoryPanel`
    - Tambahkan tombol `<Printer>` di header panel menggunakan `usePrintAction`
    - Nonaktifkan tombol saat `isLoading === true`; tambahkan `<Tooltip>`
    - Tambahkan `<PrintHeader>` dengan `studentName`, `nis`, dan tanggal cetak
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 15.2, 15.4, 15.5_

- [x] 10. Integrasi ke `PresensiSection` — Bukti Izin (Admin & Guru)
  - [x] 10.1 Tambahkan `BuktiFotoPreview` ke dialog detail izin di `PresensiSection`
    - Render `<BuktiFotoPreview>` di dalam dialog detail izin saat `bukti_foto` tersedia
    - `onDownload`: gunakan `useDownloadAction` untuk mengunduh file dari URL bukti
    - Gunakan nama file asli dari URL jika tersedia; fallback ke `bukti-izin-{YYYY-MM-DD}.{ekstensi}`
    - Tangani error unduhan: `notify("error")` dan biarkan dialog tetap terbuka
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 10.2 Tambahkan tombol "Cetak Detail" ke footer dialog detail izin di `PresensiSection`
    - Tambahkan tombol `<Printer>` di `DialogFooter` menggunakan `usePrintAction`
    - Tambahkan `<PrintHeader>` dengan `studentName`, `nis`, dan tanggal cetak
    - Sembunyikan tombol aksi dan navigasi dialog saat `@media print`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 15.2, 15.4_

- [x] 11. Integrasi ke `SiswaOverview` (Siswa)
  - [x] 11.1 Tambahkan tombol "Unduh Riwayat" ke `SiswaOverview`
    - Tambahkan tombol `<Download>` di header kartu riwayat absensi menggunakan `useDownloadAction`
    - `fetchData`: serialize data riwayat absensi pribadi ke CSV menggunakan `arrayToCsv`
    - Gunakan `generateExportFilename` dengan `dataType: 'riwayat-absensi-saya'`
    - Nonaktifkan tombol saat tidak ada data atau `isLoading === true`; tambahkan `<Tooltip>`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 15.1, 15.4, 15.5_

  - [x] 11.2 Tambahkan tombol "Cetak Riwayat" ke `SiswaOverview`
    - Tambahkan tombol `<Printer>` di header kartu riwayat absensi menggunakan `usePrintAction`
    - Nonaktifkan tombol saat tidak ada data atau `isLoading === true`; tambahkan `<Tooltip>`
    - Tambahkan `<PrintHeader>` dengan `studentName`, `nis`, dan tanggal cetak
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 15.2, 15.4, 15.5_

- [x] 12. Integrasi ke `KelolaGuruSection` (Admin)
  - [x] 12.1 Tambahkan tombol "Unduh Daftar" ke `KelolaGuruSection`
    - Tambahkan tombol `<Download>` di header tab "Daftar Guru" menggunakan `useDownloadAction`
    - `fetchData`: serialize daftar guru yang sedang ditampilkan ke CSV menggunakan `arrayToCsv`
    - Gunakan `generateExportFilename` dengan `dataType: 'daftar-guru'`
    - Tampilkan `notify("warning")` jika tidak ada data dan tidak buka save dialog
    - Nonaktifkan tombol saat `isDownloading === true`; tampilkan loading indicator
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 15.1, 15.4, 15.5_

- [x] 13. Checkpoint — Pastikan semua integrasi berfungsi
  - Jalankan `npm test` dan pastikan semua test lulus
  - Verifikasi TypeScript compile tanpa error dengan `npx tsc --noEmit`
  - Tanyakan kepada user jika ada pertanyaan sebelum melanjutkan ke property tests tambahan

- [ ] 14. Property-based tests untuk komponen terintegrasi
  - [ ]* 14.1 Tulis property-based test untuk validasi download dialog (Property 5)
    - File: `src/__tests__/components/LaporanSection.property.test.tsx`
    - **Property 5: Download Validation Blocks Confirm** — untuk sembarang state dialog di mana `downloadRange === 'custom'` dan salah satu tanggal null/kosong, tombol konfirmasi HARUS memiliki atribut `disabled`
    - **Validates: Requirements 1.2**

  - [ ]* 14.2 Tulis property-based test untuk error notification print (Property 7)
    - File: `src/__tests__/hooks/use-print-action.property.test.ts`
    - **Property 7: Error Notification on Any Print Failure** — untuk sembarang error yang dilempar `window.print()`, hook HARUS memanggil `notify` dengan severity `'error'`
    - **Validates: Requirements 2.3, 4.2, 6.4, 8.4, 10.4, 12.3**

  - [ ]* 14.3 Tulis property-based test untuk filter export (Property 8)
    - File: `src/__tests__/components/LaporanSection.property.test.tsx` (tambahkan ke file yang sama)
    - **Property 8: Active Filter Passed to Export** — untuk sembarang nilai filter kelas/jurusan aktif di LaporanSection, saat download dikonfirmasi, `window.electronAPI.exportReport` HARUS dipanggil dengan nilai filter tersebut sebagai query parameter
    - **Validates: Requirements 1.8**

  - [ ]* 14.4 Tulis property-based test untuk disabled button tooltip (Property 12)
    - File: `src/__tests__/components/DownloadPrintButtons.property.test.tsx`
    - **Property 12: Disabled Button Has Tooltip** — untuk sembarang tombol unduh/cetak yang dirender dalam kondisi disabled (loading atau tidak ada data), tombol HARUS memiliki elemen tooltip yang non-empty
    - **Validates: Requirements 15.4**

- [x] 15. Final checkpoint — Pastikan semua tests lulus
  - Jalankan `npm test` dan pastikan semua test lulus tanpa error
  - Verifikasi TypeScript compile tanpa error dengan `npx tsc --noEmit`
  - Tanyakan kepada user jika ada pertanyaan

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk keterlacakan
- `arrayToCsv` helper dapat diimplementasikan sebagai fungsi lokal di setiap komponen atau diekstrak ke `src/lib/export-filename.ts` sebagai utilitas bersama
- Semua tombol unduh menggunakan ikon `<Download>` dari `lucide-react`; semua tombol cetak menggunakan `<Printer>`
- `window.electronAPI.showSaveDialog`, `writeFile`, dan `exportReport` sudah tersedia di preload.js — tidak perlu menambahkan IPC handler baru
- `fast-check` dikonfigurasi dengan minimum 100 iterasi (default)
- Tooltip menggunakan komponen `<Tooltip>` dari shadcn/ui yang sudah tersedia di project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "2.4", "3.1", "3.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.5", "3.6", "5.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "7.1", "7.2", "8.1", "9.1", "9.2", "11.1", "11.2", "12.1"] },
    { "id": 4, "tasks": ["8.2", "8.3", "10.1", "10.2"] },
    { "id": 5, "tasks": ["14.1", "14.2", "14.3", "14.4"] }
  ]
}
```
