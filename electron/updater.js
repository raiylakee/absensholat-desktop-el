const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

function initAutoUpdater(win) {
  autoUpdater.on("checking-for-update", () => {
    win.webContents.send("update-status", "checking");
  });

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update-status", "available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    win.webContents.send("update-status", "not-available", info);
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("update-status", "error", err == null ? "Unknown error" : (err.stack || err.toString()));
  });

  autoUpdater.on("download-progress", (progressObj) => {
    win.webContents.send("update-progress", progressObj.percent);
  });

  autoUpdater.on("update-downloaded", (info) => {
    win.webContents.send("update-status", "downloaded", info);
  });

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error("Failed to check for updates:", err);
      });
    }, 5000);
  }
}

module.exports = { initAutoUpdater };
