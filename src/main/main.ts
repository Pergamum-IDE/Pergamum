import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import path from "node:path";
import { registerFileIpc } from "./fileIpc";
import { registerGlossaryIpc } from "./glossaryIpc";
import { installApplicationMenu } from "./menu";
import { registerProjectIpc } from "./projectIpc";
import { registerSettingsIpc } from "./settingsIpc";

let mainWindow: BrowserWindow | null = null;

if (started) {
  app.quit();
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    title: "Pergamum",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    return;
  }

  await mainWindow.loadFile(
    path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
  );
}

app.whenReady().then(async () => {
  await installApplicationMenu();
  registerFileIpc();
  registerGlossaryIpc();
  registerProjectIpc();
  registerSettingsIpc();
  void createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
