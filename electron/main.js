const { app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const handlers = require("./handlers");
const { initAutoUpdater } = require("./updater");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      zoomFactor: 1,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Reset zoom to 100% on startup and prevent zoom persistence
  win.webContents.setZoomFactor(1);
  win.webContents.on("did-finish-load", () => {
    win.webContents.setZoomFactor(1);
  });

  // Window control handlers
  ipcMain.handle("window-minimize", () => win.minimize());
  ipcMain.handle("window-maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle("window-close", () => win.close());
  ipcMain.handle("window-start-drag", () => {
    // No-op: drag is handled via CSS -webkit-app-region
  });

  initAutoUpdater(win);
}

app.whenReady().then(() => {
  handlers.register(ipcMain);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
