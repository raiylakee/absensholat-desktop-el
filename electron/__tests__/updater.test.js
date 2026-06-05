import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import { createRequire } from "module";

// Mock electron
vi.mock("electron", () => ({
  app: {
    isPackaged: true,
  },
}));

// Create a mock autoUpdater emitter
const mockAutoUpdater = new EventEmitter();
mockAutoUpdater.checkForUpdatesAndNotify = vi.fn(() => Promise.resolve());

vi.mock("electron-updater", () => ({
  autoUpdater: mockAutoUpdater,
}));

// Inject mock into require.cache for CJS require calls
const req = createRequire(import.meta.url);
try {
  const electronPath = req.resolve("electron");
  req.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
      app: {
        isPackaged: true,
      },
    },
  };
} catch (e) {
  console.error("Failed to inject electron mock into require.cache:", e);
}

try {
  const updaterPath = req.resolve("electron-updater");
  req.cache[updaterPath] = {
    id: updaterPath,
    filename: updaterPath,
    loaded: true,
    exports: {
      autoUpdater: mockAutoUpdater,
    },
  };
} catch (e) {
  console.error("Failed to inject electron-updater mock into require.cache:", e);
}


describe("Main Process Auto-Updater Module", () => {
  let mockWin;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoUpdater.removeAllListeners();
    mockWin = {
      webContents: {
        send: vi.fn(),
      },
    };
  });

  it("registers status event listeners and forwards them to the window", async () => {
    const { initAutoUpdater } = await import("../updater.js");
    initAutoUpdater(mockWin);

    // Test checking-for-update
    mockAutoUpdater.emit("checking-for-update");
    expect(mockWin.webContents.send).toHaveBeenCalledWith("update-status", "checking");

    // Test update-available
    mockAutoUpdater.emit("update-available", { version: "1.3.0" });
    expect(mockWin.webContents.send).toHaveBeenCalledWith("update-status", "available", { version: "1.3.0" });

    // Test update-not-available
    mockAutoUpdater.emit("update-not-available", { version: "1.2.0" });
    expect(mockWin.webContents.send).toHaveBeenCalledWith("update-status", "not-available", { version: "1.2.0" });

    // Test update-downloaded
    mockAutoUpdater.emit("update-downloaded", { version: "1.3.0" });
    expect(mockWin.webContents.send).toHaveBeenCalledWith("update-status", "downloaded", { version: "1.3.0" });
  });

  it("forwards download-progress event with correct percentage", async () => {
    const { initAutoUpdater } = await import("../updater.js");
    initAutoUpdater(mockWin);

    mockAutoUpdater.emit("download-progress", { percent: 52.4 });
    expect(mockWin.webContents.send).toHaveBeenCalledWith("update-progress", 52.4);
  });

  it("forwards error event with a stringified description", async () => {
    const { initAutoUpdater } = await import("../updater.js");
    initAutoUpdater(mockWin);

    const testError = new Error("Network error");
    mockAutoUpdater.emit("error", testError);
    expect(mockWin.webContents.send).toHaveBeenCalledWith(
      "update-status",
      "error",
      expect.stringContaining("Network error")
    );
  });
});
