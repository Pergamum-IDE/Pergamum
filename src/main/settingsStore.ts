import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createDefaultApplicationSettings,
  defaultApplicationSettings,
  type ApplicationSettings,
  type RecentProject,
  type SaveApplicationSettingsRequest
} from "../shared/settings";
import { isLanguage } from "../shared/i18n";
import { resolveCatalogValue } from "../shared/settingsCatalog";

const settingsFileName = "settings.json";
const maxRecentProjects = 10;

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

// Default and validation both come from the catalog: missing or invalid
// input falls back to the catalog default, a valid value passes through.
// This is a single-source resolution over this file's own raw JSON — not
// the Project > Application > Default effective-resolution chain.
function readPreviewSettings(value: unknown): ApplicationSettings["preview"] {
  if (!isObject(value)) {
    return {
      renderer: resolveCatalogValue("preview.renderer", undefined).value
    };
  }

  return {
    renderer: resolveCatalogValue("preview.renderer", value.renderer).value
  };
}

function readSettingsValue(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    return createDefaultApplicationSettings();
  }

  return {
    showStatusBar:
      typeof value.showStatusBar === "boolean"
        ? value.showStatusBar
        : defaultApplicationSettings.showStatusBar,
    language: isLanguage(value.language)
      ? value.language
      : defaultApplicationSettings.language,
    preview: readPreviewSettings(value.preview),
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
    keys.length !== 2 ||
    !keys.includes("showStatusBar") ||
    !keys.includes("language") ||
    typeof value.showStatusBar !== "boolean" ||
    !isLanguage(value.language)
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    showStatusBar: value.showStatusBar,
    language: value.language
  };
}

function parsePreviewSettingsForWrite(
  value: unknown
): ApplicationSettings["preview"] {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 1 ||
    !keys.includes("renderer") ||
    value.renderer === undefined
  ) {
    throw new Error("Invalid application settings.");
  }

  const resolution = resolveCatalogValue("preview.renderer", value.renderer);

  if (!resolution.ok) {
    throw new Error("Invalid application settings.");
  }

  return {
    renderer: resolution.value
  };
}

function parseApplicationSettingsForWrite(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 4 ||
    !keys.includes("showStatusBar") ||
    !keys.includes("language") ||
    !keys.includes("preview") ||
    !keys.includes("recentProjects") ||
    typeof value.showStatusBar !== "boolean" ||
    !isLanguage(value.language)
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    showStatusBar: value.showStatusBar,
    language: value.language,
    preview: parsePreviewSettingsForWrite(value.preview),
    recentProjects: parseRecentProjectsForSave(value.recentProjects)
  };
}

export async function loadSettings(): Promise<ApplicationSettings> {
  let rawSettings: string;

  try {
    rawSettings = await fs.readFile(settingsFilePath(), "utf8");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return createDefaultApplicationSettings();
    }

    return createDefaultApplicationSettings();
  }

  try {
    return readSettingsValue(JSON.parse(rawSettings));
  } catch {
    return createDefaultApplicationSettings();
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
    showStatusBar: settingsRequest.showStatusBar,
    language: settingsRequest.language
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
