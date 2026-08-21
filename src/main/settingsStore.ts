import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createDefaultApplicationSettings,
  type ApplicationSettings,
  type RecentProject,
  type SaveApplicationSettingsRequest
} from "../shared/settings";
import {
  resolveCatalogValue,
  validateCatalogValue
} from "../shared/settingsCatalog";

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

// Like readPreviewSettings above: default and validation both come from the
// catalog, so a missing or invalid on-disk workbench.statusBar.visible
// falls back to the catalog default rather than failing startup.
function readWorkbenchStatusBarSettings(
  value: unknown
): ApplicationSettings["workbench"]["statusBar"] {
  const visible = isObject(value) ? value.visible : undefined;

  return {
    visible: resolveCatalogValue("workbench.statusBar.visible", visible).value
  };
}

// #174: reads the legacy top-level `language` / `showStatusBar` keys are
// intentionally never consulted here — only the nested workbench.language /
// workbench.statusBar.visible keys are read, matching the write path below.
//
// language/statusBar.visible resolve through the catalog like
// readPreviewSettings (missing/invalid -> catalog default). fontFamily
// keeps the validate-and-omit behavior from #173 D-7 below it: a missing or
// rejected fontFamily stays absent from ApplicationSettings so the write
// path can preserve sparse settings.json storage instead of writing
// "system-ui" back. The catalog default for fontFamily is applied later, in
// resolveEffectiveSettings — not baked in here.
function readWorkbenchSettings(value: unknown): ApplicationSettings["workbench"] {
  const workbenchValue = isObject(value) ? value : undefined;

  const language = resolveCatalogValue(
    "workbench.language",
    workbenchValue?.language
  ).value;
  const statusBar = readWorkbenchStatusBarSettings(workbenchValue?.statusBar);

  if (
    workbenchValue === undefined ||
    typeof workbenchValue.fontFamily !== "string" ||
    !validateCatalogValue("workbench.fontFamily", workbenchValue.fontFamily).ok
  ) {
    return { language, statusBar };
  }

  return { language, statusBar, fontFamily: workbenchValue.fontFamily };
}

function readSettingsValue(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    return createDefaultApplicationSettings();
  }

  return {
    preview: readPreviewSettings(value.preview),
    workbench: readWorkbenchSettings(value.workbench),
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

  if (keys.length !== 1 || !keys.includes("workbench")) {
    throw new Error("Invalid application settings.");
  }

  return {
    workbench: parseWorkbenchSettingsForWrite(value.workbench)
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

// Same validate-and-reject-the-whole-write style as parsePreviewSettingsForWrite:
// an invalid language/statusBar.visible/fontFamily rejects the save request
// rather than silently dropping just that field (#173 D-9). An absent
// fontFamily key is valid and preserves sparse storage (#173 D-7); language
// and statusBar are required (#174 — neither is sparse).
function parseWorkbenchStatusBarSettingsForWrite(
  value: unknown
): ApplicationSettings["workbench"]["statusBar"] {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (keys.length !== 1 || !keys.includes("visible")) {
    throw new Error("Invalid application settings.");
  }

  const resolution = resolveCatalogValue(
    "workbench.statusBar.visible",
    value.visible
  );

  if (!resolution.ok) {
    throw new Error("Invalid application settings.");
  }

  return { visible: resolution.value };
}

function parseWorkbenchSettingsForWrite(
  value: unknown
): ApplicationSettings["workbench"] {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);
  const hasFontFamily = keys.includes("fontFamily");
  const expectedKeyCount = hasFontFamily ? 3 : 2;

  if (
    keys.length !== expectedKeyCount ||
    !keys.includes("language") ||
    !keys.includes("statusBar")
  ) {
    throw new Error("Invalid application settings.");
  }

  const languageResolution = resolveCatalogValue(
    "workbench.language",
    value.language
  );

  if (!languageResolution.ok) {
    throw new Error("Invalid application settings.");
  }

  const statusBar = parseWorkbenchStatusBarSettingsForWrite(value.statusBar);

  if (!hasFontFamily) {
    return { language: languageResolution.value, statusBar };
  }

  if (
    typeof value.fontFamily !== "string" ||
    !validateCatalogValue("workbench.fontFamily", value.fontFamily).ok
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    language: languageResolution.value,
    statusBar,
    fontFamily: value.fontFamily
  };
}

function parseApplicationSettingsForWrite(value: unknown): ApplicationSettings {
  if (!isObject(value)) {
    throw new Error("Invalid application settings.");
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 3 ||
    !keys.includes("preview") ||
    !keys.includes("workbench") ||
    !keys.includes("recentProjects")
  ) {
    throw new Error("Invalid application settings.");
  }

  return {
    preview: parsePreviewSettingsForWrite(value.preview),
    workbench: parseWorkbenchSettingsForWrite(value.workbench),
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
    workbench: settingsRequest.workbench
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
