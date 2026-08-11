import { ipcMain } from "electron";
import { SETTINGS_CHANNELS, type ApplicationSettings } from "../shared/api";
import {
  loadSettings,
  parseSaveApplicationSettingsRequest,
  saveApplicationSettings
} from "./settingsStore";

export function registerSettingsIpc(): void {
  ipcMain.handle(SETTINGS_CHANNELS.getSettings, async () => loadSettings());

  ipcMain.handle(
    SETTINGS_CHANNELS.saveSettings,
    async (_event, rawSettings: unknown): Promise<ApplicationSettings> => {
      const settingsRequest = parseSaveApplicationSettingsRequest(rawSettings);
      return saveApplicationSettings(settingsRequest);
    }
  );
}
