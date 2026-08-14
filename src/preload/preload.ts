import { contextBridge, ipcRenderer } from "electron";
import {
  DEBUG_LOG_CHANNELS,
  FILE_CHANNELS,
  GLOSSARY_CHANNELS,
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
  },
  glossary: {
    create: (input) => ipcRenderer.invoke(GLOSSARY_CHANNELS.create, input),
    getById: (id) =>
      ipcRenderer.invoke(GLOSSARY_CHANNELS.getById, {
        id
      }),
    list: () => ipcRenderer.invoke(GLOSSARY_CHANNELS.list),
    lookupSurface: (surface) =>
      ipcRenderer.invoke(GLOSSARY_CHANNELS.lookupSurface, {
        surface
      }),
    update: (input) => ipcRenderer.invoke(GLOSSARY_CHANNELS.update, input),
    delete: (id, confirmMessage) =>
      ipcRenderer.invoke(GLOSSARY_CHANNELS.delete, {
        id,
        confirmMessage
      })
  },
  debugLog: {
    logEvent: (request) =>
      ipcRenderer.invoke(DEBUG_LOG_CHANNELS.logEvent, request),
    getSnapshot: () => ipcRenderer.invoke(DEBUG_LOG_CHANNELS.getSnapshot),
    onEvent: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        debugLogEvent: unknown
      ) => {
        callback(debugLogEvent as Parameters<typeof callback>[0]);
      };

      ipcRenderer.on(DEBUG_LOG_CHANNELS.event, listener);
      ipcRenderer.send(DEBUG_LOG_CHANNELS.subscribe);

      return () => {
        ipcRenderer.off(DEBUG_LOG_CHANNELS.event, listener);
        ipcRenderer.send(DEBUG_LOG_CHANNELS.unsubscribe);
      };
    }
  }
};

contextBridge.exposeInMainWorld("pergamum", pergamumApi);
