import { app, BrowserWindow } from "electron";

function createWindow() {
  let win = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
    darkTheme: true,
  });
  win.loadFile("index.html");
  win.webContents.openDevTools();
  win.on("closed", () => {
    win = null as any;
  });
}

app.whenReady().then(createWindow);

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
