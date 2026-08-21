import { defaultLanguage, type Language } from "./i18n";
import {
  getCatalogDefaultValue,
  validateCatalogValue
} from "./settingsCatalog";

export type SettingsCategory =
  | "general"
  | "appearance"
  | "editor"
  | "preview"
  | "project";

export type PreviewRendererId = "markdown";

export interface RecentProject {
  path: string;
  name: string;
}

export interface ApplicationPreviewSettings {
  renderer: PreviewRendererId;
}

export interface ApplicationSettings {
  showStatusBar: boolean;
  language: Language;
  preview: ApplicationPreviewSettings;
  recentProjects: RecentProject[];
}

export interface SaveApplicationSettingsRequest {
  showStatusBar: boolean;
  language: Language;
}

export interface ProjectPreviewSettings {
  renderer?: PreviewRendererId;
}

export interface ProjectSettings {
  preview?: ProjectPreviewSettings;
}

export interface EffectivePreviewSettings {
  renderer: PreviewRendererId;
}

export interface EffectiveSettings {
  showStatusBar: boolean;
  language: Language;
  preview: EffectivePreviewSettings;
}

// The settings catalog is the only source of truth for this default —
// derived from it rather than duplicating the literal "markdown" here.
//
// Compatibility wrapper: kept public as the preview renderer default even
// though no production module currently imports it directly (only
// builtInDefaultSettings below, in this same module, consumes it) —
// existing preview settings consumers that need the built-in default go
// through builtInDefaultSettings/defaultApplicationSettings, which are
// seeded from this constant.
export const defaultPreviewRenderer: PreviewRendererId =
  getCatalogDefaultValue("preview.renderer");

export const builtInDefaultSettings: EffectiveSettings = {
  showStatusBar: true,
  language: defaultLanguage,
  preview: {
    renderer: defaultPreviewRenderer
  }
};

export const defaultApplicationSettings: ApplicationSettings = {
  showStatusBar: builtInDefaultSettings.showStatusBar,
  language: builtInDefaultSettings.language,
  preview: {
    renderer: builtInDefaultSettings.preview.renderer
  },
  recentProjects: []
};

export function createDefaultApplicationSettings(): ApplicationSettings {
  return {
    showStatusBar: defaultApplicationSettings.showStatusBar,
    language: defaultApplicationSettings.language,
    preview: {
      renderer: defaultApplicationSettings.preview.renderer
    },
    recentProjects: []
  };
}

// Delegates to the settings catalog's own enum validation instead of a
// hand-rolled `value === defaultPreviewRenderer` check.
export function isPreviewRendererId(
  value: unknown
): value is PreviewRendererId {
  return validateCatalogValue("preview.renderer", value).ok;
}

export function resolveEffectiveSettings(
  applicationSettings: ApplicationSettings,
  projectSettings: ProjectSettings | null | undefined
): EffectiveSettings {
  return {
    showStatusBar: applicationSettings.showStatusBar,
    language: applicationSettings.language,
    preview: {
      renderer:
        projectSettings?.preview?.renderer ??
        applicationSettings.preview.renderer ??
        builtInDefaultSettings.preview.renderer
    }
  };
}
