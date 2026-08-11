import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApplicationSettings,
  RecentProject,
  SaveApplicationSettingsRequest
} from "../shared/api";

const settingsFileName = "settings.json";
const maxRecentProjects = 10;

const defaultSettings: ApplicationSettings = {
  showStatusBar: true,
  recentProjects: []
};

function createDefaultSettings(): ApplicationSettings {
  return {
    showStatusBar: defaultSettings.showStatusBar,
    recentProjects: []
  };
}

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

function isRecentProject(value: unknown): value is RecentProject {
  return (
    isObject(value) &&
    typeof value.path === "string" &&
    typeof value.name === "string"
  );
}

function normalizeRecentProjects(
  recentProjects: RecentProject[]
): RecentProject[] {
  const normalizedProjects: RecentProject[] = [];
  const seenPaths = new Set<string>();

  for (const recentProject of recentProjects) {
    if (seenPaths.has(recentProject.path)) {
      continue;
    }

    seenPaths.add(recentProject.path);
    normalizedProjects.push({
      path: recentProject.path,
      name: recentProject.name
    });

    if (normalizedProjects.length === maxRecentProjects) {
      break;
    }
  }

  return normalizedProjects;
}

function readRecentProjects(value: unknown): RecentProject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeRecentProjects(value.filter(isRecentProject));
}

function readSettingsValue(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    return createDefaultSettings();
  }

  return {
    showStatusBar:
      typeof value.showStatusBar === "boolean"
        ? value.showStatusBar
        : defaultSettings.showStatusBar,
    recentProjects: readRecentProjects(value.recentProjects)
  };
}

function parseRecentProjectForSave(value: unknown): RecentProject {
  if (!isObject(value)) {
    throw new Error("Invalid recent project.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 2 ||
    !keys.includes("path") ||
    !keys.includes("name") ||
    typeof value.path !== "string" ||
    typeof value.name !== "string"
  ) {
    throw new Error("Invalid recent project.");
  }

  return {
    path: value.path,
    name: value.name
  };
}

function parseRecentProjectsForSave(value: unknown): RecentProject[] {
  if (!Array.isArray(value) || value.length > maxRecentProjects) {
    throw new Error("Invalid application settings.");
  }

  const recentProjects = value.map(parseRecentProjectForSave);
  const paths = new Set<string>();

  for (const recentProject of recentProjects) {
    if (paths.has(recentProject.path)) {
      throw new Error("Invalid application settings.");
    }

    paths.add(recentProject.path);
  }

  return recentProjects;
}

export function parseSaveApplicationSettingsRequest(
  value: unknown
): SaveApplicationSettingsRequest {
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

function parseApplicationSettingsForWrite(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 2 ||
    !keys.includes("showStatusBar") ||
    !keys.includes("recentProjects") ||
    typeof value.showStatusBar !== "boolean"
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    showStatusBar: value.showStatusBar,
    recentProjects: parseRecentProjectsForSave(value.recentProjects)
  };
}

export async function loadSettings(): Promise<ApplicationSettings> {
  let rawSettings: string;

  try {
    rawSettings = await fs.readFile(settingsFilePath(), "utf8");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return createDefaultSettings();
    }

    return createDefaultSettings();
  }

  try {
    return readSettingsValue(JSON.parse(rawSettings));
  } catch {
    return createDefaultSettings();
  }
}

async function saveSettings(
  settings: ApplicationSettings
): Promise<ApplicationSettings> {
  const validatedSettings = parseApplicationSettingsForWrite(settings);
  const filePath = settingsFilePath();

  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(
    filePath,
    `${JSON.stringify(validatedSettings, null, 2)}\n`,
    "utf8"
  );

  return validatedSettings;
}

export async function saveApplicationSettings(
  settingsRequest: SaveApplicationSettingsRequest
): Promise<ApplicationSettings> {
  const settings = await loadSettings();

  return saveSettings({
    ...settings,
    showStatusBar: settingsRequest.showStatusBar
  });
}

export async function recordRecentProject(
  recentProject: RecentProject
): Promise<ApplicationSettings> {
  const settings = await loadSettings();
  const recentProjects = normalizeRecentProjects([
    recentProject,
    ...settings.recentProjects.filter(
      (storedProject) => storedProject.path !== recentProject.path
    )
  ]);

  return saveSettings({
    ...settings,
    recentProjects
  });
}

export async function isRecentProjectPath(projectPath: string): Promise<boolean> {
  const settings = await loadSettings();

  return settings.recentProjects.some(
    (recentProject) => recentProject.path === projectPath
  );
}
