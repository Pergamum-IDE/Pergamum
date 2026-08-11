import { contextBridge, ipcRenderer } from "electron";
import {
  FILE_CHANNELS,
  PROJECT_CHANNELS,
  type PergamumApi
} from "../shared/api";

const pergamumApi: PergamumApi = {
  files: {
    openMarkdown: () => ipcRenderer.invoke(FILE_CHANNELS.openMarkdown),
    saveMarkdown: (filePath, content) =>
      ipcRenderer.invoke(FILE_CHANNELS.saveMarkdown, {
        path: filePath,
        content
      })
  },
  projects: {
    openProject: () => ipcRenderer.invoke(PROJECT_CHANNELS.openProject),
    readProjectDocument: (relativePath) =>
      ipcRenderer.invoke(PROJECT_CHANNELS.readProjectDocument, {
        relativePath
      }),
    saveProjectDocument: (relativePath, content) =>
      ipcRenderer.invoke(PROJECT_CHANNELS.saveProjectDocument, {
        relativePath,
        content
      })
  }
};

contextBridge.exposeInMainWorld("pergamum", pergamumApi);
