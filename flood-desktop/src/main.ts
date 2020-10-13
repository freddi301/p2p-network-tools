import { app, BrowserWindow } from "electron";
import { ipcMain } from "electron";

function createWindow() {
  let win = new BrowserWindow({
    width: 1600,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
    },
    darkTheme: true,
    frame: false,
  });
  win.loadFile("index.html");
  // win.webContents.openDevTools();
  win.on("closed", () => {
    win = null as any;
  });
}

app.whenReady().then(createWindow);

ipcMain.on("app:quit", () => {
  app.quit();
});

// for macos

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
