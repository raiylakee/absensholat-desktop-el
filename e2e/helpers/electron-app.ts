import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { MockApiServer } from './mock-server';

export class E2eElectronApp {
  public app!: ElectronApplication;
  public page!: Page;
  private tempHomeDir: string;

  constructor() {
    this.tempHomeDir = path.join(__dirname, '../../e2e-temp-home');
  }

  public async launch(envOverrides: Record<string, string> = {}): Promise<void> {
    // Ensure temporary home directory exists for hardware ID isolation
    if (!fs.existsSync(this.tempHomeDir)) {
      fs.mkdirSync(this.tempHomeDir, { recursive: true });
    }

    // Pre-create a mock hardware ID to make tests deterministic
    const hwidPath = path.join(this.tempHomeDir, '.presensisholat-hwid');
    fs.writeFileSync(hwidPath, 'e2e-test-hardware-id-123456789');

    // Launch Electron application using Playwright
    this.app = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        HOME: this.tempHomeDir, // Linux/macOS home isolation
        USERPROFILE: this.tempHomeDir, // Windows profile isolation
        API_BASE_URL: 'https://absensholat-api.vercel.app',
        NODE_ENV: 'test',
        ...envOverrides,
      },
    });

    // Capture the main window page
    this.page = await this.app.firstWindow();
  }

  public async close(): Promise<void> {
    // 1. Close application
    if (this.app) {
      await this.app.close();
    }

    // 2. Clean up sandbox home files
    try {
      if (fs.existsSync(this.tempHomeDir)) {
        fs.rmSync(this.tempHomeDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('Sandbox cleanup warning:', e);
    }
  }

  /**
   * Helper to wait for the splash screen animation to finish
   * and load the login page structure.
   */
  public async waitForLoginScreen(): Promise<void> {
    await this.page.waitForSelector('form', { timeout: 15000 });
  }

  /**
   * Performs standard login operation on the UI page.
   */
  public async performLogin(identifier: string, password: string): Promise<void> {
    await this.waitForLoginScreen();
    await this.page.fill('input[id="identifier"]', identifier);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
