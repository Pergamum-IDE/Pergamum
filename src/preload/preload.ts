import { contextBridge, ipcRenderer } from "electron";
import {
  FILE_CHANNELS,
  PROJECT_CHANNELS,
  SETTINGS_CHANNELS,
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
    openRecentProject: (projectPath) =>
      ipcRenderer.invoke(PROJECT_CHANNELS.openRecentProject, {
        path: projectPath
      }),
    readProjectDocument: (relativePath) =>
      ipcRenderer.invoke(PROJECT_CHANNELS.readProjectDocument, {
        relativePath
      }),
    saveProjectDocument: (relativePath, content) =>
      ipcRenderer.invoke(PROJECT_CHANNELS.saveProjectDocument, {
        relativePath,
        content
      })
  },
  settings: {
    getSettings: () => ipcRenderer.invoke(SETTINGS_CHANNELS.getSettings),
    saveSettings: (settings) =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.saveSettings, settings)
  }
};

contextBridge.exposeInMainWorld("pergamum", pergamumApi);
