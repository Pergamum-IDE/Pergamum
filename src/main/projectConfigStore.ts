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

// ADR-0006 S-23: a settings-subtree structural problem or a rejected known
// setting value must not fail project open. Only project identity/config
// outside the "settings" subtree (handled by parseProjectConfig below) and
// malformed JSON (handled by readProjectConfig below) still throw.
//
// A rejected/absent entry is represented purely by omission from the parsed
// project settings result — there is no rejected-entry result type
// (ADR-0006 S-22 diagnostics are out of scope for this read path) and no
// direct substitution of the catalog default here (that belongs to
// resolveEffectiveSettings's existing Project > Application > Default
// fallthrough, not to this parse step). Returning `undefined` rather than
// `{}` for "nothing accepted" keeps the parsed result limited to accepted
// entries only, per #170.
function parseProjectPreviewSettings(
  settings: Record<string, unknown>
): ProjectPreviewSettings | undefined {
  const preview = settings.preview;

  if (preview === undefined) {
    return undefined;
  }

  if (!isConfigObject(preview)) {
    return undefined;
  }

  if (!isPreviewRendererId(preview.renderer)) {
    return undefined;
  }

  return { renderer: preview.renderer };
}

// Application-only keys placed under a project's "settings" are scope
// violations (ADR-0006 S-22): rejected as project overrides, but not a
// reason to fail project open. ProjectSettings only ever extracts "preview",
// so these keys are never read into the parsed result regardless of this
// list — parseProjectSettings simply does not throw for their presence.
function parseProjectSettings(value: unknown): ProjectSettings | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isConfigObject(value)) {
    return undefined;
  }

  const preview = parseProjectPreviewSettings(value);

  return preview ? { preview } : undefined;
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
