import { test, expect } from '@playwright/test';
import { E2eElectronApp } from './helpers/electron-app';

test.describe('Presensi Sholat Desktop Production E2E Test Suite', () => {
  let e2e: E2eElectronApp;

  test.beforeEach(async () => {
    e2e = new E2eElectronApp();
  });

  test.afterEach(async () => {
    await e2e.close();
  });

  test('E2E Production Workflow: Authentication, Navigation, and Data Fetching', async () => {
    // 1. Launch Application
    await e2e.launch();

    // Verify Splash Screen transition
    const splashHeader = e2e.page.locator('h1:has-text("Presensi Sholat")');
    await expect(splashHeader).toBeVisible();

    // Wait for login form to load
    await e2e.waitForLoginScreen();
    await expect(e2e.page.locator('button[type="submit"]:has-text("Masuk")')).toBeVisible();

    // ==========================================
    // A. TEST FAILED LOGIN (Invalid credentials)
    // ==========================================
    await e2e.page.fill('input[id="identifier"]', 'invalid-email@sekolah.sch.id');
    await e2e.page.fill('input[name="password"]', 'InvalidPassword123!');
    await e2e.page.click('button[type="submit"]');

    // Assert authentication error toast/alert is rendered
    await expect(e2e.page.locator('text=username atau password salah')).toBeVisible({ timeout: 10000 });

    // Clear inputs
    await e2e.page.fill('input[id="identifier"]', '');
    await e2e.page.fill('input[name="password"]', '');

    // ==========================================
    // B. TEST SUCCESSFUL ADMIN LOGIN
    // ==========================================
    await e2e.page.fill('input[id="identifier"]', 'admin@sekolah.sch.id');
    await e2e.page.fill('input[name="password"]', 'StrongPass123!');
    await e2e.page.click('button[type="submit"]');

    // Wait for Dashboard to navigate & check elements
    await expect(e2e.page.locator('text=Ringkasan Hari Ini')).toBeVisible({ timeout: 15000 });
    
    // Assert Budi Santoso (Admin Name) is rendered in sidebar/profile card
    await expect(e2e.page.locator('text=Budi Santoso')).toBeVisible();

    // Verify Admin Portal Menu Items are visible on sidebar
    await expect(e2e.page.getByRole('button', { name: 'Kelola Guru', exact: true })).toBeVisible();
    await expect(e2e.page.getByRole('button', { name: 'Kelola Siswa', exact: true })).toBeVisible();
    await expect(e2e.page.getByRole('button', { name: 'Kelola Kelas', exact: true })).toBeVisible();
    await expect(e2e.page.getByRole('button', { name: 'QR Code', exact: true })).toBeVisible();
    await expect(e2e.page.getByRole('button', { name: 'Laporan', exact: true })).toBeVisible();

    // ==========================================
    // C. TEST DATA FETCHING: KELOLA GURU
    // ==========================================
    await e2e.page.getByRole('button', { name: 'Kelola Guru', exact: true }).click();
    
    // Wait for the teacher roster list to be fetched from production and rendered
    await e2e.page.waitForSelector('table, div[data-slot="card"]', { timeout: 15000 });
    
    // Verify that the table/headers are rendered and contain teachers info
    await expect(e2e.page.locator('text=NIP')).toBeVisible();
    
    // ==========================================
    // D. TEST DATA FETCHING: KELOLA SISWA
    // ==========================================
    await e2e.page.getByRole('button', { name: 'Kelola Siswa', exact: true }).click();
    
    // Wait for student roster to render
    await e2e.page.waitForSelector('table, div[data-slot="card"]', { timeout: 15000 });
    await expect(e2e.page.locator('text=NIS')).toBeVisible();

    // ==========================================
    // E. TEST DATA FETCHING: LAPORAN DROPDOWNS
    // ==========================================
    await e2e.page.getByRole('button', { name: 'Laporan', exact: true }).click();
    
    // Wait for dropdown selectors to render filters
    await e2e.page.waitForSelector('select, button[aria-haspopup="listbox"]', { timeout: 15000 });

    // ==========================================
    // F. TEST DATA FETCHING: QR CODE GENERATOR
    // ==========================================
    await e2e.page.getByRole('button', { name: 'QR Code', exact: true }).click();
    
    // Select verification code tab
    await e2e.page.locator('[role="tab"]:has-text("Kode Verifikasi"), button:has-text("Kode Verifikasi"), text="Kode Verifikasi"').first().click();
    
    // Wait for real verification code container or refresh button to render
    await e2e.page.waitForSelector('button:has-text("Salin"), button:has-text("Segarkan")', { timeout: 15000 });

    // ==========================================
    // G. LOGOUT WORKFLOW
    // ==========================================
    const profileButton = e2e.page.locator('button:has-text("Budi Santoso")');
    await profileButton.click();

    const logoutButton = e2e.page.locator('[role="menuitem"]:has-text("Keluar"), button:has-text("Keluar"), text="Keluar"').first();
    await logoutButton.click();

    // Verify it redirects back to login page
    await e2e.waitForLoginScreen();
    await expect(e2e.page.locator('button[type="submit"]:has-text("Masuk")')).toBeVisible();
  });
});
