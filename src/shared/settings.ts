import { defaultLanguage, type Language } from "./i18n";
import {
  getCatalogDefaultValue,
  validateCatalogValue
} from "./settingsCatalog";

export type SettingScope =
  | "application"
  | "project"
  | "applicationProjectOverride";

export type SettingsCategory =
  | "general"
  | "appearance"
  | "editor"
  | "preview"
  | "project";

export type SettingsCatalogKey =
  | "general.language"
  | "general.showStatusBar"
  | "appearance.uiTheme"
  | "appearance.uiFontFamily"
  | "appearance.uiFontSize"
  | "editor.fontFamily"
  | "editor.fontSize"
  | "editor.fontWeight"
  | "editor.lineHeight"
  | "editor.letterSpacing"
  | "editor.wordWrap"
  | "editor.caretWidth"
  | "editor.caretStyle"
  | "editor.caretBlink"
  | "preview.renderer"
  | "preview.fontFamily"
  | "preview.fontSize"
  | "preview.writingDirection"
  | "project.manuscriptDirectory"
  | "project.glossaryDirectory"
  | "project.assetsDirectory";

export interface SettingsCatalogEntry {
  key: SettingsCatalogKey;
  category: SettingsCategory;
  scope: SettingScope;
  implemented: boolean;
}

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

export const settingsCatalog = [
  {
    key: "general.language",
    category: "general",
    scope: "application",
    implemented: true
  },
  {
    key: "general.showStatusBar",
    category: "general",
    scope: "application",
    implemented: true
  },
  {
    key: "appearance.uiTheme",
    category: "appearance",
    scope: "application",
    implemented: false
  },
  {
    key: "appearance.uiFontFamily",
    category: "appearance",
    scope: "application",
    implemented: false
  },
  {
    key: "appearance.uiFontSize",
    category: "appearance",
    scope: "application",
    implemented: false
  },
  {
    key: "editor.fontFamily",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.fontSize",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.fontWeight",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.lineHeight",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.letterSpacing",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.wordWrap",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.caretWidth",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.caretStyle",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "editor.caretBlink",
    category: "editor",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "preview.renderer",
    category: "preview",
    scope: "applicationProjectOverride",
    implemented: true
  },
  {
    key: "preview.fontFamily",
    category: "preview",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "preview.fontSize",
    category: "preview",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "preview.writingDirection",
    category: "preview",
    scope: "applicationProjectOverride",
    implemented: false
  },
  {
    key: "project.manuscriptDirectory",
    category: "project",
    scope: "project",
    implemented: false
  },
  {
    key: "project.glossaryDirectory",
    category: "project",
    scope: "project",
    implemented: false
  },
  {
    key: "project.assetsDirectory",
    category: "project",
    scope: "project",
    implemented: false
  }
] as const satisfies readonly SettingsCatalogEntry[];

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
