import { contextBridge, ipcRenderer } from "electron";
import type { PergamumApi } from "../shared/api";

const FILE_CHANNELS = {
  openMarkdown: "files:openMarkdown",
  saveMarkdown: "files:saveMarkdown"
} as const;

const pergamumApi: PergamumApi = {
  files: {
    openMarkdown: () => ipcRenderer.invoke(FILE_CHANNELS.openMarkdown),
    saveMarkdown: (filePath, content) =>
      ipcRenderer.invoke(FILE_CHANNELS.saveMarkdown, {
        path: filePath,
        content
      })
  }
};

contextBridge.exposeInMainWorld("pergamum", pergamumApi);
