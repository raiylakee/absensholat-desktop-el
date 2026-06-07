# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presensisholat.spec.ts >> Presensi Sholat Desktop Production E2E Test Suite >> E2E Production Workflow: Authentication, Navigation, and Data Fetching
- Location: e2e/presensisholat.spec.ts:15:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=NIP')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=NIP')

```

```yaml
- complementary:
  - list:
    - listitem:
      - button "Presensi Sholat Presensi Sholat Portal Administrator":
        - img "Presensi Sholat"
        - text: Presensi Sholat Portal Administrator
  - list:
    - listitem:
      - button "Beranda"
    - listitem:
      - button "Jadwal"
    - listitem:
      - button "Kelola Siswa"
    - listitem:
      - button "Kelola Kelas"
    - listitem:
      - button "Kelola Guru"
    - listitem:
      - button "Presensi"
    - listitem:
      - button "Pengajuan Izin"
    - listitem:
      - button "Laporan"
    - listitem:
      - button "QR Code"
    - listitem:
      - button "Siswa Belum Terdaftar"
    - listitem:
      - button "Perangkat Siswa"
  - list:
    - listitem:
      - button "BS Budi Santoso admin@sekolah.sch.id"
- main:
  - button "Toggle Sidebar":
    - img
    - text: Toggle Sidebar
  - separator
  - heading "Kelola Guru" [level=1]
  - button "Notifikasi"
  - button
  - button
  - button
  - text: Kelola Guru Manajemen data guru dan penugasan wali kelas.
  - button "Daftar Guru"
  - button "Wali Kelas Aktif"
  - button "Unduh Daftar" [disabled]
  - textbox "Cari nama atau email..."
  - combobox: Semua
  - button "Tambah Guru"
  - status "Loading"
- button
- region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { E2eElectronApp } from './helpers/electron-app';
  3   | 
  4   | test.describe('Presensi Sholat Desktop Production E2E Test Suite', () => {
  5   |   let e2e: E2eElectronApp;
  6   | 
  7   |   test.beforeEach(async () => {
  8   |     e2e = new E2eElectronApp();
  9   |   });
  10  | 
  11  |   test.afterEach(async () => {
  12  |     await e2e.close();
  13  |   });
  14  | 
  15  |   test('E2E Production Workflow: Authentication, Navigation, and Data Fetching', async () => {
  16  |     // 1. Launch Application
  17  |     await e2e.launch();
  18  | 
  19  |     // Verify Splash Screen transition
  20  |     const splashHeader = e2e.page.locator('h1:has-text("Presensi Sholat")');
  21  |     await expect(splashHeader).toBeVisible();
  22  | 
  23  |     // Wait for login form to load
  24  |     await e2e.waitForLoginScreen();
  25  |     await expect(e2e.page.locator('button[type="submit"]:has-text("Masuk")')).toBeVisible();
  26  | 
  27  |     // ==========================================
  28  |     // A. TEST FAILED LOGIN (Invalid credentials)
  29  |     // ==========================================
  30  |     await e2e.page.fill('input[id="identifier"]', 'invalid-email@sekolah.sch.id');
  31  |     await e2e.page.fill('input[name="password"]', 'InvalidPassword123!');
  32  |     await e2e.page.click('button[type="submit"]');
  33  | 
  34  |     // Assert authentication error toast/alert is rendered
  35  |     await expect(e2e.page.locator('text=username atau password salah')).toBeVisible({ timeout: 10000 });
  36  | 
  37  |     // Clear inputs
  38  |     await e2e.page.fill('input[id="identifier"]', '');
  39  |     await e2e.page.fill('input[name="password"]', '');
  40  | 
  41  |     // ==========================================
  42  |     // B. TEST SUCCESSFUL ADMIN LOGIN
  43  |     // ==========================================
  44  |     await e2e.page.fill('input[id="identifier"]', 'admin@sekolah.sch.id');
  45  |     await e2e.page.fill('input[name="password"]', 'StrongPass123!');
  46  |     await e2e.page.click('button[type="submit"]');
  47  | 
  48  |     // Wait for Dashboard to navigate & check elements
  49  |     await expect(e2e.page.locator('text=Ringkasan Hari Ini')).toBeVisible({ timeout: 15000 });
  50  |     
  51  |     // Assert Budi Santoso (Admin Name) is rendered in sidebar/profile card
  52  |     await expect(e2e.page.locator('text=Budi Santoso')).toBeVisible();
  53  | 
  54  |     // Verify Admin Portal Menu Items are visible on sidebar
  55  |     await expect(e2e.page.getByRole('button', { name: 'Kelola Guru', exact: true })).toBeVisible();
  56  |     await expect(e2e.page.getByRole('button', { name: 'Kelola Siswa', exact: true })).toBeVisible();
  57  |     await expect(e2e.page.getByRole('button', { name: 'Kelola Kelas', exact: true })).toBeVisible();
  58  |     await expect(e2e.page.getByRole('button', { name: 'QR Code', exact: true })).toBeVisible();
  59  |     await expect(e2e.page.getByRole('button', { name: 'Laporan', exact: true })).toBeVisible();
  60  | 
  61  |     // ==========================================
  62  |     // C. TEST DATA FETCHING: KELOLA GURU
  63  |     // ==========================================
  64  |     await e2e.page.getByRole('button', { name: 'Kelola Guru', exact: true }).click();
  65  |     
  66  |     // Wait for the teacher roster list to be fetched from production and rendered
  67  |     await e2e.page.waitForSelector('table, div[data-slot="card"]', { timeout: 15000 });
  68  |     
  69  |     // Verify that the table/headers are rendered and contain teachers info
> 70  |     await expect(e2e.page.locator('text=NIP')).toBeVisible();
      |                                                ^ Error: expect(locator).toBeVisible() failed
  71  |     
  72  |     // ==========================================
  73  |     // D. TEST DATA FETCHING: KELOLA SISWA
  74  |     // ==========================================
  75  |     await e2e.page.getByRole('button', { name: 'Kelola Siswa', exact: true }).click();
  76  |     
  77  |     // Wait for student roster to render
  78  |     await e2e.page.waitForSelector('table, div[data-slot="card"]', { timeout: 15000 });
  79  |     await expect(e2e.page.locator('text=NIS')).toBeVisible();
  80  | 
  81  |     // ==========================================
  82  |     // E. TEST DATA FETCHING: LAPORAN DROPDOWNS
  83  |     // ==========================================
  84  |     await e2e.page.getByRole('button', { name: 'Laporan', exact: true }).click();
  85  |     
  86  |     // Wait for dropdown selectors to render filters
  87  |     await e2e.page.waitForSelector('select, button[aria-haspopup="listbox"]', { timeout: 15000 });
  88  | 
  89  |     // ==========================================
  90  |     // F. TEST DATA FETCHING: QR CODE GENERATOR
  91  |     // ==========================================
  92  |     await e2e.page.getByRole('button', { name: 'QR Code', exact: true }).click();
  93  |     
  94  |     // Select verification code tab
  95  |     await e2e.page.locator('[role="tab"]:has-text("Kode Verifikasi"), button:has-text("Kode Verifikasi"), text="Kode Verifikasi"').first().click();
  96  |     
  97  |     // Wait for real verification code container or refresh button to render
  98  |     await e2e.page.waitForSelector('button:has-text("Salin"), button:has-text("Segarkan")', { timeout: 15000 });
  99  | 
  100 |     // ==========================================
  101 |     // G. LOGOUT WORKFLOW
  102 |     // ==========================================
  103 |     const profileButton = e2e.page.locator('button:has-text("Budi Santoso")');
  104 |     await profileButton.click();
  105 | 
  106 |     const logoutButton = e2e.page.locator('[role="menuitem"]:has-text("Keluar"), button:has-text("Keluar"), text="Keluar"').first();
  107 |     await logoutButton.click();
  108 | 
  109 |     // Verify it redirects back to login page
  110 |     await e2e.waitForLoginScreen();
  111 |     await expect(e2e.page.locator('button[type="submit"]:has-text("Masuk")')).toBeVisible();
  112 |   });
  113 | });
  114 | 
```