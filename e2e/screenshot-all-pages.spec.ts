import { test } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

// type: 'sidebar' = regular sidebar button, 'dropdown' = in profile footer dropdown
const ADMIN_PAGES = [
  { menu: 'Beranda', filename: 'Gambar 6.1 Halaman Beranda Admin', type: 'sidebar' as const },
  { menu: 'Jadwal', filename: 'Gambar 6.2 Halaman Jadwal Admin', type: 'sidebar' as const },
  { menu: 'Kelola Siswa', filename: 'Gambar 6.3 Halaman Kelola Siswa Admin', type: 'sidebar' as const },
  { menu: 'Kelola Kelas', filename: 'Gambar 6.4 Halaman Kelola Kelas Admin', type: 'sidebar' as const },
  { menu: 'Kelola Guru', filename: 'Gambar 6.5 Halaman Kelola Guru Admin', type: 'sidebar' as const },
  { menu: 'Presensi', filename: 'Gambar 6.6 Halaman Presensi Admin', type: 'sidebar' as const },
  { menu: 'Pengajuan Izin', filename: 'Gambar 6.7 Halaman Pengajuan Izin Admin', type: 'sidebar' as const },
  { menu: 'Laporan', filename: 'Gambar 6.8 Halaman Laporan Admin', type: 'sidebar' as const },
  { menu: 'Kode QR', filename: 'Gambar 6.9 Halaman QR Code Admin', type: 'sidebar' as const },
  { menu: 'Siswa Belum Terdaftar', filename: 'Gambar 6.10 Halaman Siswa Belum Terdaftar Admin', type: 'sidebar' as const },
  { menu: 'Perangkat Siswa', filename: 'Gambar 6.11 Halaman Perangkat Siswa Admin', type: 'sidebar' as const },
  { menu: 'Akun', filename: 'Gambar 6.12 Halaman Profile Admin', type: 'dropdown' as const },
  { menu: 'Pengaturan', filename: 'Gambar 6.13 Halaman Pengaturan Admin', type: 'dropdown' as const },
];

const GURU_PAGES = [
  { menu: 'Beranda', filename: 'Gambar 6.14 Halaman Beranda Guru', type: 'sidebar' as const },
  { menu: 'Jadwal', filename: 'Gambar 6.15 Halaman Jadwal Guru', type: 'sidebar' as const },
  { menu: 'Presensi', filename: 'Gambar 6.16 Halaman Presensi Guru', type: 'sidebar' as const },
  { menu: 'Pengajuan Izin', filename: 'Gambar 6.17 Halaman Pengajuan Izin Guru', type: 'sidebar' as const },
  { menu: 'Laporan', filename: 'Gambar 6.18 Halaman Laporan Guru', type: 'sidebar' as const },
  { menu: 'Siswa Belum Terdaftar', filename: 'Gambar 6.19 Halaman Siswa Belum Terdaftar Guru', type: 'sidebar' as const },
  { menu: 'Profil', filename: 'Gambar 6.20 Halaman Profile Guru', type: 'dropdown' as const },
  { menu: 'Pengaturan', filename: 'Gambar 6.21 Halaman Pengaturan Guru', type: 'dropdown' as const },
];

const SISWA_PAGES = [
  { menu: 'Beranda', filename: 'Gambar 6.22 Halaman Beranda Siswa', type: 'sidebar' as const },
  { menu: 'Pindai QR', filename: 'Gambar 6.23 Halaman Pindai QR Siswa', type: 'sidebar' as const },
  { menu: 'Izin', filename: 'Gambar 6.24 Halaman Izin Siswa', type: 'sidebar' as const },
  { menu: 'Profil', filename: 'Gambar 6.25 Halaman Profil Siswa', type: 'dropdown' as const },
  { menu: 'Pengaturan', filename: 'Gambar 6.26 Halaman Pengaturan Siswa', type: 'dropdown' as const },
];

const TEMP_HOME = path.join(__dirname, '../e2e-temp-home-screenshots');

function ensureTempHome(): void {
  if (!fs.existsSync(TEMP_HOME)) {
    fs.mkdirSync(TEMP_HOME, { recursive: true });
  }
  fs.writeFileSync(path.join(TEMP_HOME, '.presensisholat-hwid'), 'screenshot-hwid-' + Date.now());
}

function cleanupTempHome(): void {
  try {
    if (fs.existsSync(TEMP_HOME)) {
      fs.rmSync(TEMP_HOME, { recursive: true, force: true });
    }
  } catch (_) {}
}

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  ensureTempHome();
  const app = await electron.launch({
    args: [path.join(__dirname, '../electron/main.js')],
    env: {
      ...process.env,
      HOME: TEMP_HOME,
      USERPROFILE: TEMP_HOME,
      NODE_ENV: 'development',
    },
  });
  const page = await app.firstWindow();
  return { app, page };
}

async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return !document.querySelector('button[type="submit"]');
  }, { timeout: 20000 });
  await page.waitForTimeout(2000);
}

async function openProfileDropdown(page: Page): Promise<void> {
  // The profile button is in the sidebar footer, it's the last SidebarMenuButton
  // which shows user initials in a circle + name + chevron
  // Close any existing dropdown first by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Click the sidebar footer button that has the user initials (circle with letters)
  const footerBtn = page.locator('aside button').filter({ has: page.locator('[class*="rounded-full"]') }).last();
  await footerBtn.click();
  await page.waitForTimeout(800);
}

async function loginAndCapturePages(
  identifier: string,
  password: string,
  pages: Array<{ menu: string; filename: string; type: 'sidebar' | 'dropdown' }>,
  roleLabel: string
): Promise<void> {
  console.log(`\n========== ${roleLabel} ==========`);
  const { app, page } = await launchApp();

  try {
    await page.waitForSelector('input[id="identifier"]', { timeout: 20000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'Gambar 6.0 Halaman Login.png'),
      fullPage: false,
    });
    console.log('Captured: Gambar 6.0 Halaman Login.png');

    await page.fill('input[id="identifier"]', identifier);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await waitForDashboard(page);

    for (const pg of pages) {
      try {
        if (pg.type === 'dropdown') {
          // Open the profile dropdown menu in sidebar footer
          await openProfileDropdown(page);
          await page.waitForTimeout(300);
          // Click the menu item in the dropdown
          const menuItem = page.locator('[role="menuitem"]').filter({ hasText: pg.menu });
          await menuItem.first().click();
          await page.waitForTimeout(2000);
        } else {
          const btn = page.getByRole('button', { name: pg.menu, exact: true });
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await btn.click();
            if (pg.menu === 'Pindai QR') {
              await page.waitForTimeout(1500);
              const manualBtn = page.locator('button:has-text("Manual"), [role="tab"]:has-text("Manual")');
              if (await manualBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                await manualBtn.first().click();
                await page.waitForTimeout(1000);
              }
            } else {
              await page.waitForTimeout(2000);
            }
          }
        }
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${pg.filename}.png`),
          fullPage: false,
        });
        console.log(`Captured: ${pg.filename}.png`);
      } catch (err) {
        console.warn(`Warning: Could not capture ${pg.filename}: ${err}`);
      }
    }
  } finally {
    await app.close();
    cleanupTempHome();
  }
}

test.describe('Screenshot All Pages - Production API', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Capture Admin Pages', async () => {
    await loginAndCapturePages(
      'admin@sekolah.sch.id',
      'password123',
      ADMIN_PAGES,
      'ADMIN'
    );
  });

  test('Capture Guru/Wali Kelas Pages', async () => {
    await loginAndCapturePages(
      '198503152010012002',
      'password123',
      GURU_PAGES,
      'GURU / WALI KELAS'
    );
  });

  test('Capture Siswa Pages', async () => {
    await loginAndCapturePages(
      '7951/1512.111',
      'StrongPass123!',
      SISWA_PAGES,
      'SISWA'
    );
  });
});
