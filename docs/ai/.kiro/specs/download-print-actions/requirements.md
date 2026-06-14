# Requirements Document

## Introduction

Fitur ini menambahkan kemampuan unduh (download) dan cetak (print) secara menyeluruh di seluruh aplikasi Absensholat Desktop. Di mana pun data ditampilkan — tabel absensi, laporan, data siswa, data guru, QR Code, riwayat izin — pengguna dapat mengunduh data tersebut sebagai file (Excel, CSV, PDF, atau gambar) dan/atau mencetaknya langsung dari aplikasi. Fitur ini berlaku untuk semua peran: Admin, Guru (Wali Kelas), dan Siswa.

## Glossary

- **Download_Manager**: Komponen/utilitas yang menangani logika unduh file, termasuk pemilihan path simpan, pemanggilan API ekspor, dan penulisan file ke disk.
- **Print_Manager**: Komponen/utilitas yang menangani logika cetak, termasuk persiapan konten cetak dan pemanggilan `window.print()`.
- **Export_Filename_Generator**: Fungsi murni yang menghasilkan nama file unduhan berdasarkan tipe data, tanggal, dan filter aktif.
- **LaporanSection**: Halaman laporan absensi (Admin dan Guru).
- **PresensiSection**: Halaman lihat presensi (Admin dan Guru).
- **ManageSiswaSection**: Halaman kelola data siswa (Admin).
- **KelolaGuruSection**: Halaman kelola data guru (Admin).
- **QRGeneratorSection**: Halaman generator QR Code presensi (Admin).
- **AttendanceHistoryPanel**: Panel riwayat kehadiran per siswa (Admin dan Guru).
- **SiswaOverview**: Halaman dashboard siswa yang menampilkan riwayat absensi pribadi.
- **SiswaPermitSection**: Halaman pengajuan dan riwayat izin siswa.
- **Print_Layout**: Tampilan halaman saat dicetak, menggunakan CSS `@media print`.
- **Bukti_File**: File lampiran bukti izin (gambar atau PDF) yang diunggah siswa.

---

## Requirements

### Requirement 1: Unduh Laporan Absensi

**User Story:** Sebagai Admin atau Guru, saya ingin mengunduh laporan absensi dalam berbagai format, sehingga saya dapat mengarsipkan dan melaporkan data kehadiran siswa secara offline.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol "Unduh Laporan" di LaporanSection, THE Download_Manager SHALL menampilkan dialog konfigurasi unduhan yang memungkinkan pemilihan format (Excel, CSV, PDF) dan rentang waktu (mingguan, bulanan, tahunan, atau kustom).
2. IF pengguna memilih rentang waktu kustom dan salah satu atau kedua tanggal tidak diisi atau tidak valid, THEN THE Download_Manager SHALL menonaktifkan tombol konfirmasi unduhan dan menampilkan pesan validasi yang menjelaskan field mana yang perlu diperbaiki.
3. WHEN pengguna mengkonfirmasi unduhan dengan input yang valid, THE Download_Manager SHALL menampilkan dialog simpan file sistem operasi dengan nama file default yang dihasilkan oleh Export_Filename_Generator.
4. IF pengguna membatalkan dialog simpan file sistem operasi, THEN THE Download_Manager SHALL menutup dialog simpan file dan kembali ke dialog konfigurasi unduhan tanpa mengubah state aplikasi.
5. WHEN unduhan berhasil, THE Download_Manager SHALL menyimpan file ke path yang dipilih pengguna dan menampilkan notifikasi sukses yang menyertakan path file tersebut.
6. IF unduhan gagal karena kesalahan jaringan atau API, THEN THE Download_Manager SHALL menampilkan notifikasi error dengan pesan yang menjelaskan penyebab kegagalan.
7. WHILE unduhan sedang berlangsung, THE Download_Manager SHALL menampilkan indikator loading dan menonaktifkan tombol unduh untuk mencegah permintaan ganda.
8. WHERE filter kelas aktif di LaporanSection, THE Download_Manager SHALL menyertakan parameter filter kelas tersebut dalam permintaan ekspor ke API.

---

### Requirement 2: Cetak Laporan Absensi

**User Story:** Sebagai Admin atau Guru, saya ingin mencetak laporan absensi langsung dari aplikasi, sehingga saya dapat menghasilkan dokumen fisik tanpa perlu mengunduh file terlebih dahulu.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol "Cetak" di LaporanSection dan tidak ada data yang ditampilkan, THE Print_Manager SHALL menonaktifkan tombol cetak dan menampilkan tooltip yang menjelaskan bahwa tidak ada data untuk dicetak.
2. WHEN pengguna mengklik tombol "Cetak" di LaporanSection dan data tersedia, THE Print_Manager SHALL mempersiapkan konten tabel absensi yang sedang ditampilkan dan memanggil dialog cetak sistem operasi.
3. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error yang menyebutkan langkah mana yang gagal kepada pengguna dan membatalkan proses cetak.
4. WHILE mode cetak aktif (`@media print`), THE Print_Layout SHALL menyembunyikan elemen antarmuka yang tidak relevan untuk cetak, termasuk sidebar, tombol aksi, header navigasi, dan kontrol pagination.
5. WHILE mode cetak aktif, THE Print_Layout SHALL menampilkan header dokumen cetak yang memuat nama sekolah, judul laporan, dan rentang tanggal data yang dicetak.
6. WHILE mode cetak aktif, THE Print_Layout SHALL memformat tabel data agar semua kolom terlihat dalam lebar halaman A4, dengan baris yang melanjut ke halaman berikutnya jika diperlukan.

---

### Requirement 3: Unduh Data Siswa

**User Story:** Sebagai Admin, saya ingin mengunduh daftar data siswa sebagai file CSV atau Excel, sehingga saya dapat memproses data siswa di luar aplikasi.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol "Unduh Data Siswa" di ManageSiswaSection, THE Download_Manager SHALL menampilkan dialog simpan file dengan format pilihan (CSV atau Excel).
2. WHEN pengguna mengkonfirmasi unduhan, THE Download_Manager SHALL mengekspor data siswa yang sedang ditampilkan (sesuai filter aktif: jurusan, kelas, jenis kelamin, agama) ke file yang dipilih dan menampilkan dialog simpan file sistem operasi.
3. THE Export_Filename_Generator SHALL menghasilkan nama file default dalam format `data-siswa-{jurusan}-{YYYY-MM-DD}.{ekstensi}` di mana jurusan diisi dengan filter jurusan aktif atau "semua" jika tidak ada filter.
4. IF tidak ada data siswa yang ditampilkan saat tombol unduh diklik, THEN THE Download_Manager SHALL menampilkan notifikasi peringatan bahwa tidak ada data untuk diunduh dan tidak membuka dialog simpan file.

---

### Requirement 4: Cetak Data Siswa

**User Story:** Sebagai Admin, saya ingin mencetak daftar siswa langsung dari aplikasi, sehingga saya dapat menghasilkan dokumen fisik untuk keperluan administrasi.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol "Cetak" di ManageSiswaSection, THE Print_Manager SHALL mempersiapkan tabel data siswa yang sedang ditampilkan dan memanggil dialog cetak sistem operasi.
2. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error kepada pengguna dan membatalkan proses cetak.
3. WHILE mode cetak aktif, THE Print_Layout SHALL menyembunyikan kolom checkbox seleksi, kolom aksi, sidebar, header navigasi, dan kontrol pagination dari tabel cetak.
4. WHILE mode cetak aktif, THE Print_Layout SHALL menampilkan header dokumen cetak yang memuat judul "Daftar Siswa", filter aktif yang diterapkan (jurusan, kelas, jenis kelamin, agama — atau "Semua" jika tidak ada filter), dan tanggal cetak dalam format `DD MMMM YYYY`.
5. IF tidak ada data siswa yang ditampilkan saat tombol cetak diklik, THEN THE Print_Manager SHALL menonaktifkan tombol cetak dan menampilkan tooltip yang menjelaskan bahwa tidak ada data untuk dicetak.

---

### Requirement 5: Unduh QR Code Presensi sebagai Gambar

**User Story:** Sebagai Admin, saya ingin mengunduh QR Code presensi sebagai file gambar, sehingga saya dapat mencetak atau mendistribusikannya secara terpisah.

#### Acceptance Criteria

1. WHEN QR Code telah berhasil digenerate di QRGeneratorSection, THE Download_Manager SHALL menampilkan tombol "Unduh QR" yang aktif.
2. WHEN pengguna mengklik tombol "Unduh QR", THE Download_Manager SHALL mengkonversi elemen SVG QR Code menjadi file PNG dengan resolusi minimum 512×512 piksel dan menampilkan dialog simpan file. IF pengguna membatalkan dialog simpan file, THE Download_Manager SHALL membatalkan unduhan tanpa mengubah state aplikasi.
3. IF konversi SVG ke PNG gagal, THEN THE Download_Manager SHALL menampilkan notifikasi error yang menyebutkan bahwa konversi gambar gagal dan membatalkan proses unduhan.
4. THE Export_Filename_Generator SHALL menghasilkan nama file default dalam format `qr-presensi-{YYYY-MM-DD}-{HHmm}.png`.
5. IF QR Code belum digenerate, THEN THE Download_Manager SHALL menonaktifkan tombol "Unduh QR" dan menampilkan tooltip yang menjelaskan bahwa QR Code harus digenerate terlebih dahulu.

---

### Requirement 6: Cetak QR Code Presensi

**User Story:** Sebagai Admin, saya ingin mencetak QR Code presensi langsung dari aplikasi, sehingga saya dapat menempelkannya di ruang kelas atau mushola.

#### Acceptance Criteria

1. WHEN QR Code telah berhasil digenerate di QRGeneratorSection, THE Print_Manager SHALL menampilkan tombol "Cetak QR" yang aktif.
2. IF QR Code belum digenerate, THEN THE Print_Manager SHALL menonaktifkan tombol "Cetak QR" dan menampilkan tooltip yang menjelaskan bahwa QR Code harus digenerate terlebih dahulu.
3. WHEN pengguna mengklik tombol "Cetak QR", THE Print_Manager SHALL mempersiapkan halaman cetak yang hanya menampilkan QR Code, nama sekolah, dan instruksi penggunaan tidak lebih dari 2 baris, lalu memanggil dialog cetak.
4. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error kepada pengguna dan membatalkan proses cetak.
5. WHILE mode cetak aktif, THE Print_Layout SHALL memformat QR Code agar berukuran minimum 150×150 mm dan terpusat di halaman cetak untuk kemudahan pemindaian.

---

### Requirement 7: Unduh Riwayat Kehadiran Per Siswa

**User Story:** Sebagai Admin atau Guru, saya ingin mengunduh riwayat kehadiran seorang siswa dari panel riwayat, sehingga saya dapat menyimpan catatan individual siswa.

#### Acceptance Criteria

1. WHEN AttendanceHistoryPanel terbuka dan data riwayat berhasil dimuat, THE Download_Manager SHALL menampilkan tombol "Unduh Riwayat" yang aktif di header panel.
2. WHEN pengguna mengklik tombol "Unduh Riwayat", THE Download_Manager SHALL mengekspor data riwayat kehadiran siswa tersebut ke file CSV dan menampilkan dialog simpan file sistem operasi dengan nama file default yang dihasilkan oleh Export_Filename_Generator.
3. THE Export_Filename_Generator SHALL menghasilkan nama file default dalam format `riwayat-{nama-siswa}-{nis}-{YYYY-MM-DD}.csv`.
4. IF ekspor atau dialog simpan file gagal, THEN THE Download_Manager SHALL menampilkan notifikasi error yang menjelaskan penyebab kegagalan.
5. IF data riwayat masih dimuat (loading), THEN THE Download_Manager SHALL menonaktifkan tombol "Unduh Riwayat" dan menampilkan tooltip yang menjelaskan bahwa data sedang dimuat.

---

### Requirement 8: Cetak Riwayat Kehadiran Per Siswa

**User Story:** Sebagai Admin atau Guru, saya ingin mencetak riwayat kehadiran seorang siswa dari panel riwayat, sehingga saya dapat memberikan laporan fisik kepada orang tua atau wali.

#### Acceptance Criteria

1. WHEN AttendanceHistoryPanel terbuka dan data riwayat berhasil dimuat, THE Print_Manager SHALL menampilkan tombol "Cetak Riwayat" yang aktif di header panel.
2. IF data riwayat masih dimuat (loading), THEN THE Print_Manager SHALL menonaktifkan tombol "Cetak Riwayat" dan menampilkan tooltip yang menjelaskan bahwa data sedang dimuat.
3. WHEN pengguna mengklik tombol "Cetak Riwayat", THE Print_Manager SHALL mempersiapkan konten panel riwayat dan memanggil dialog cetak.
4. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error kepada pengguna dan membatalkan proses cetak.
5. WHILE mode cetak aktif, THE Print_Layout SHALL menampilkan header yang memuat nama siswa, NIS, dan tanggal cetak dalam format `DD MMMM YYYY` di bagian atas dokumen cetak, diikuti tabel data riwayat kehadiran.
6. WHILE mode cetak aktif, THE Print_Layout SHALL menyembunyikan elemen antarmuka yang tidak relevan untuk cetak, termasuk sidebar, tombol aksi, header navigasi, dan kontrol pagination.

---

### Requirement 9: Unduh Riwayat Absensi Pribadi (Siswa)

**User Story:** Sebagai Siswa, saya ingin mengunduh riwayat absensi saya sendiri sebagai file CSV, sehingga saya dapat menyimpan catatan kehadiran saya secara pribadi.

#### Acceptance Criteria

1. WHEN data riwayat absensi berhasil dimuat di SiswaOverview, THE Download_Manager SHALL menampilkan tombol "Unduh Riwayat" yang aktif di header kartu riwayat absensi.
2. WHEN pengguna mengklik tombol "Unduh Riwayat", THE Download_Manager SHALL mengekspor data riwayat absensi yang ditampilkan ke file CSV dan menampilkan dialog simpan file sistem operasi.
3. WHILE unduhan sedang berlangsung, THE Download_Manager SHALL menampilkan indikator loading dan menonaktifkan tombol "Unduh Riwayat" untuk mencegah permintaan ganda.
4. IF unduhan gagal, THEN THE Download_Manager SHALL menampilkan notifikasi error yang menjelaskan penyebab kegagalan.
5. THE Export_Filename_Generator SHALL menghasilkan nama file default dalam format `riwayat-absensi-saya-{YYYY-MM-DD}.csv`.
6. IF tidak ada data riwayat absensi yang ditampilkan, THEN THE Download_Manager SHALL menonaktifkan tombol "Unduh Riwayat" dan menampilkan tooltip yang menjelaskan bahwa tidak ada data untuk diunduh.

---

### Requirement 10: Cetak Riwayat Absensi Pribadi (Siswa)

**User Story:** Sebagai Siswa, saya ingin mencetak riwayat absensi saya sendiri, sehingga saya dapat menyerahkan bukti kehadiran secara fisik jika diperlukan.

#### Acceptance Criteria

1. WHEN data riwayat absensi berhasil dimuat di SiswaOverview, THE Print_Manager SHALL menampilkan tombol "Cetak Riwayat" yang aktif di header kartu riwayat absensi.
2. IF data riwayat absensi masih dimuat (loading) atau tidak ada data, THEN THE Print_Manager SHALL menonaktifkan tombol "Cetak Riwayat" dan menampilkan tooltip yang menjelaskan kondisi tersebut.
3. WHEN pengguna mengklik tombol "Cetak Riwayat", THE Print_Manager SHALL mempersiapkan tabel riwayat absensi dan memanggil dialog cetak.
4. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error kepada pengguna dan membatalkan proses cetak.
5. WHILE mode cetak aktif, THE Print_Layout SHALL menampilkan nama siswa, NIS, dan tanggal cetak dalam format `DD MMMM YYYY` di header dokumen cetak.

---

### Requirement 11: Unduh Bukti Izin (Admin/Guru)

**User Story:** Sebagai Admin atau Guru, saya ingin mengunduh file bukti izin yang dilampirkan siswa, sehingga saya dapat menyimpan bukti tersebut secara lokal untuk keperluan verifikasi.

#### Acceptance Criteria

1. WHEN dialog detail izin terbuka di PresensiSection dan terdapat Bukti_File yang terlampir, THE Download_Manager SHALL menampilkan tombol "Unduh Bukti" di samping tampilan bukti.
2. WHEN pengguna mengklik tombol "Unduh Bukti", THE Download_Manager SHALL mengunduh Bukti_File dari URL yang tersedia dan menampilkan dialog simpan file dengan nama file asli sebagai default. IF nama file asli tidak tersedia dari metadata URL, THE Download_Manager SHALL menggunakan format `bukti-izin-{YYYY-MM-DD}.{ekstensi}` sebagai nama file default.
3. IF Bukti_File adalah gambar (JPG, PNG), THE Download_Manager SHALL menampilkan pratinjau gambar sebelum tombol unduh.
4. IF Bukti_File adalah PDF, THE Download_Manager SHALL menampilkan ikon PDF dan nama file sebelum tombol unduh.
5. IF Bukti_File bukan gambar (JPG/PNG) maupun PDF, THE Download_Manager SHALL menampilkan ikon file generik dan nama file sebelum tombol unduh.
6. IF unduhan Bukti_File gagal, THEN THE Download_Manager SHALL menampilkan notifikasi error yang menyebutkan alasan kegagalan dan dialog detail izin tetap terbuka.

---

### Requirement 12: Cetak Detail Izin (Admin/Guru)

**User Story:** Sebagai Admin atau Guru, saya ingin mencetak detail pengajuan izin siswa, sehingga saya dapat menyimpan catatan fisik persetujuan izin.

#### Acceptance Criteria

1. WHEN dialog detail izin terbuka di PresensiSection, THE Print_Manager SHALL menampilkan tombol "Cetak Detail" di footer dialog.
2. WHEN pengguna mengklik tombol "Cetak Detail", THE Print_Manager SHALL mempersiapkan konten dialog detail izin (jenis izin, periode, keterangan, status, dan Bukti_File jika tersedia) dan memanggil dialog cetak.
3. IF persiapan konten cetak atau pembukaan dialog cetak gagal, THEN THE Print_Manager SHALL menampilkan pesan error kepada pengguna dan membatalkan proses cetak.
4. WHILE mode cetak aktif, THE Print_Layout SHALL menampilkan nama siswa, NIS, dan tanggal cetak dalam format `DD MMMM YYYY` di header dokumen cetak, serta menyembunyikan elemen antarmuka yang tidak relevan untuk cetak seperti tombol aksi dan navigasi dialog.

---

### Requirement 13: Unduh Daftar Guru

**User Story:** Sebagai Admin, saya ingin mengunduh daftar guru sebagai file CSV, sehingga saya dapat memproses data kepegawaian di luar aplikasi.

#### Acceptance Criteria

1. WHILE pengguna berada di tab "Daftar Guru" pada KelolaGuruSection, THE Download_Manager SHALL selalu menampilkan tombol "Unduh Daftar" di area header.
2. WHEN pengguna mengklik tombol "Unduh Daftar", THE Download_Manager SHALL menampilkan dialog simpan file sistem operasi, lalu mengekspor daftar guru yang sedang ditampilkan (sesuai filter pencarian aktif) ke file CSV. WHILE ekspor sedang berlangsung, THE Download_Manager SHALL menampilkan indikator loading dan menonaktifkan tombol unduh. WHEN ekspor berhasil, THE Download_Manager SHALL menampilkan notifikasi sukses yang menyertakan path file tersebut.
3. THE Export_Filename_Generator SHALL menghasilkan nama file default dalam format `daftar-guru-{YYYY-MM-DD}.csv`.
4. IF ekspor gagal karena kesalahan jaringan atau API, THEN THE Download_Manager SHALL menampilkan notifikasi error yang menjelaskan penyebab kegagalan.
5. IF tidak ada data guru yang ditampilkan saat tombol unduh diklik, THEN THE Download_Manager SHALL menampilkan notifikasi peringatan bahwa tidak ada data untuk diunduh dan tidak membuka dialog simpan file.

---

### Requirement 14: Konvensi Penamaan File Unduhan

**User Story:** Sebagai pengguna, saya ingin nama file unduhan mengikuti pola yang konsisten dan informatif, sehingga saya dapat dengan mudah mengidentifikasi isi file tanpa membukanya.

#### Acceptance Criteria

1. THE Export_Filename_Generator SHALL menghasilkan nama file yang hanya mengandung karakter alfanumerik huruf kecil, tanda hubung (-), dan titik (.), dengan panjang maksimum 255 karakter.
2. THE Export_Filename_Generator SHALL menyertakan tanggal pembuatan file dalam format `YYYY-MM-DD` pada setiap nama file yang dihasilkan.
3. THE Export_Filename_Generator SHALL menghasilkan nama file yang berbeda untuk setiap kombinasi tipe data, tanggal, dan filter yang berbeda. IF tidak ada filter aktif, THE Export_Filename_Generator SHALL menggunakan nilai "semua" sebagai representasi filter kosong dalam nama file.
4. FOR ALL kombinasi input yang valid (tipe data, tanggal, filter), THE Export_Filename_Generator SHALL menghasilkan nama file dengan ekstensi yang sesuai dengan format file yang dipilih: `.xlsx` untuk Excel, `.csv` untuk CSV, `.pdf` untuk PDF, dan `.png` untuk gambar.

---

### Requirement 15: Konsistensi Tampilan Tombol Unduh dan Cetak

**User Story:** Sebagai pengguna, saya ingin tombol unduh dan cetak memiliki tampilan dan posisi yang konsisten di seluruh aplikasi, sehingga saya dapat dengan mudah menemukan dan menggunakan fitur ini di mana pun saya berada.

#### Acceptance Criteria

1. THE Download_Manager SHALL menggunakan ikon unduh (*Download*) yang seragam untuk semua tombol unduh di seluruh aplikasi.
2. THE Print_Manager SHALL menggunakan ikon cetak (*Printer*) yang seragam untuk semua tombol cetak di seluruh aplikasi.
3. WHEN tombol unduh atau cetak ditampilkan bersama tombol aksi lain di header kartu atau tabel, THE Download_Manager dan THE Print_Manager SHALL menempatkan tombol tersebut di ujung kanan area header dalam baris yang sama dengan tombol aksi lainnya, sehingga seluruh tombol aksi berada pada satu baris horizontal yang sejajar secara vertikal.
4. IF operasi unduh atau cetak tidak tersedia karena data belum selesai dimuat atau tidak ada data yang dapat diproses, THEN THE Download_Manager dan THE Print_Manager SHALL menonaktifkan tombol terkait sehingga tombol tidak dapat diklik, menampilkan tampilan visual yang berbeda dari tombol aktif (seperti opacity berkurang), dan menampilkan tooltip yang menjelaskan alasan tombol tidak tersedia.
5. WHEN pengguna mengarahkan kursor ke tombol unduh atau cetak yang dinonaktifkan, THE Download_Manager dan THE Print_Manager SHALL menampilkan tooltip yang memuat keterangan singkat mengenai kondisi yang menyebabkan tombol tidak tersedia, dalam waktu tidak lebih dari 500 milidetik setelah kursor diam di atas tombol.
