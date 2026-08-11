import { app, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  SETTINGS_CHANNELS,
  type ApplicationSettings
} from "../shared/api";

const settingsFileName = "settings.json";

const defaultSettings: ApplicationSettings = {
  showStatusBar: true
};

function settingsFilePath(): string {
  return path.join(app.getPath("userData"), settingsFileName);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeErrorCode(error: unknown): string | undefined {
  if (isObject(error) && "code" in error) {
    return String(error.code);
  }

  return undefined;
}

function readSettingsValue(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    return defaultSettings;
  }

  return {
    showStatusBar:
      typeof value.showStatusBar === "boolean"
        ? value.showStatusBar
        : defaultSettings.showStatusBar
  };
}

function parseSettingsForSave(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 1 ||
    keys[0] !== "showStatusBar" ||
    typeof value.showStatusBar !== "boolean"
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    showStatusBar: value.showStatusBar
  };
}

async function loadSettings(): Promise<ApplicationSettings> {
  let rawSettings: string;

  try {
    rawSettings = await fs.readFile(settingsFilePath(), "utf8");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return defaultSettings;
    }

    return defaultSettings;
  }

  try {
    return readSettingsValue(JSON.parse(rawSettings));
  } catch {
    return defaultSettings;
  }
}

async function saveSettings(
  settings: ApplicationSettings
): Promise<ApplicationSettings> {
  const filePath = settingsFilePath();
  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return settings;
}

export function registerSettingsIpc(): void {
  ipcMain.handle(SETTINGS_CHANNELS.getSettings, async () => loadSettings());

  ipcMain.handle(
    SETTINGS_CHANNELS.saveSettings,
    async (_event, rawSettings: unknown): Promise<ApplicationSettings> => {
      const settings = parseSettingsForSave(rawSettings);
      return saveSettings(settings);
    }
  );
}
