import { promises as fs } from "node:fs";
import path from "node:path";
import type { PergamumProjectConfig } from "../shared/api";
import {
  isPreviewRendererId,
  type ProjectPreviewSettings,
  type ProjectSettings
} from "../shared/settings";

export const projectConfigFileName = "pergamum.json";

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return undefined;
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function invalidProjectConfig(message: string): Error {
  return new Error(`Invalid ${projectConfigFileName}: ${message}`);
}

function assertNoApplicationOnlySetting(
  settings: Record<string, unknown>,
  key: string
): void {
  if (key in settings) {
    throw invalidProjectConfig(
      `settings.${key} is application-only and cannot be set by a project.`
    );
  }
}

function assertObjectCategory(
  settings: Record<string, unknown>,
  category: string
): Record<string, unknown> | null {
  const value = settings[category];

  if (value === undefined) {
    return null;
  }

  if (!isConfigObject(value)) {
    throw invalidProjectConfig(`settings.${category} must be a JSON object.`);
  }

  return value;
}

function assertNoApplicationOnlyCategorySetting(
  categorySettings: Record<string, unknown>,
  category: string,
  key: string
): void {
  if (key in categorySettings) {
    throw invalidProjectConfig(
      `settings.${category}.${key} is application-only and cannot be set by a project.`
    );
  }
}

function parseProjectPreviewSettings(
  settings: Record<string, unknown>
): ProjectPreviewSettings | undefined {
  const preview = assertObjectCategory(settings, "preview");

  if (!preview || !("renderer" in preview)) {
    return undefined;
  }

  if (!isPreviewRendererId(preview.renderer)) {
    throw invalidProjectConfig('settings.preview.renderer must be "markdown".');
  }

  return {
    renderer: preview.renderer
  };
}

function validateApplicationOnlyProjectSettings(
  settings: Record<string, unknown>
): void {
  assertNoApplicationOnlySetting(settings, "language");
  assertNoApplicationOnlySetting(settings, "showStatusBar");
  assertNoApplicationOnlySetting(settings, "recentProjects");

  const general = assertObjectCategory(settings, "general");

  if (general) {
    assertNoApplicationOnlyCategorySetting(general, "general", "language");
    assertNoApplicationOnlyCategorySetting(general, "general", "showStatusBar");
  }

  const appearance = assertObjectCategory(settings, "appearance");

  if (appearance) {
    assertNoApplicationOnlyCategorySetting(
      appearance,
      "appearance",
      "uiTheme"
    );
    assertNoApplicationOnlyCategorySetting(
      appearance,
      "appearance",
      "uiFontFamily"
    );
    assertNoApplicationOnlyCategorySetting(
      appearance,
      "appearance",
      "uiFontSize"
    );
  }
}

function parseProjectSettings(value: unknown): ProjectSettings | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isConfigObject(value)) {
    throw invalidProjectConfig('"settings" must be a JSON object.');
  }

  validateApplicationOnlyProjectSettings(value);

  const preview = parseProjectPreviewSettings(value);

  return preview ? { preview } : {};
}

function parseProjectConfig(value: unknown): PergamumProjectConfig {
  if (!isConfigObject(value)) {
    throw invalidProjectConfig("expected a JSON object.");
  }

  const name = value.name;

  if (name !== undefined && typeof name !== "string") {
    throw invalidProjectConfig('"name" must be a string.');
  }

  const settings = parseProjectSettings(value.settings);

  return {
    ...(name === undefined ? {} : { name }),
    ...(settings === undefined ? {} : { settings })
  };
}

export async function readProjectConfig(
  rootPath: string
): Promise<PergamumProjectConfig | null> {
  const configPath = path.join(rootPath, projectConfigFileName);
  let rawConfig: string;

  try {
    rawConfig = await fs.readFile(configPath, "utf8");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return null;
    }

    throw new Error(
      `Could not read ${projectConfigFileName}: ${errorDetail(error)}`
    );
  }

  try {
    return parseProjectConfig(JSON.parse(rawConfig));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid ${projectConfigFileName}: ${errorDetail(error)}`
      );
    }

    throw error;
  }
}
