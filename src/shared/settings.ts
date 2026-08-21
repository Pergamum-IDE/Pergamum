import type { Language } from "./i18n";
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

export interface WorkbenchStatusBarSettings {
  visible: boolean;
}

// #174: language and statusBar.visible moved here from legacy top-level
// ApplicationSettings.language / .showStatusBar — both applicationOnly
// catalog entries, always resolved to a concrete value at read time (not
// sparse). fontFamily stays optional, like ProjectPreviewSettings.renderer:
// absence on disk is distinct from an explicit value, so the write path can
// preserve sparse settings.json storage (#173 D-7) instead of eagerly
// writing back the catalog default.
export interface ApplicationWorkbenchSettings {
  language: Language;
  statusBar: WorkbenchStatusBarSettings;
  fontFamily?: string;
}

export interface ApplicationSettings {
  preview: ApplicationPreviewSettings;
  workbench: ApplicationWorkbenchSettings;
  recentProjects: RecentProject[];
}

// #174: nested under workbench, matching ApplicationWorkbenchSettings.
// fontFamily stays optional here too — omitting it from a save request
// preserves the existing sparse value (#173 D-7); it does not reset it.
export interface SaveApplicationSettingsRequest {
  workbench: {
    language: Language;
    statusBar: WorkbenchStatusBarSettings;
    fontFamily?: string;
  };
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

export interface EffectiveWorkbenchSettings {
  language: Language;
  statusBar: WorkbenchStatusBarSettings;
  fontFamily: string;
}

export interface EffectiveSettings {
  preview: EffectivePreviewSettings;
  workbench: EffectiveWorkbenchSettings;
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
  preview: {
    renderer: defaultPreviewRenderer
  },
  workbench: {
    language: getCatalogDefaultValue("workbench.language"),
    statusBar: {
      visible: getCatalogDefaultValue("workbench.statusBar.visible")
    },
    fontFamily: getCatalogDefaultValue("workbench.fontFamily")
  }
};

// workbench.fontFamily is intentionally omitted here, not
// builtInDefaultSettings.workbench.fontFamily — this is the "nothing on
// disk yet" baseline (#173 D-7), and resolveEffectiveSettings below is what
// falls through to the catalog default when fontFamily is absent.
// workbench.language / workbench.statusBar.visible are NOT sparse (#174):
// unlike fontFamily, they always carry a concrete value, mirroring the
// legacy top-level language/showStatusBar fields they replace.
export const defaultApplicationSettings: ApplicationSettings = {
  preview: {
    renderer: builtInDefaultSettings.preview.renderer
  },
  workbench: {
    language: builtInDefaultSettings.workbench.language,
    statusBar: {
      visible: builtInDefaultSettings.workbench.statusBar.visible
    }
  },
  recentProjects: []
};

export function createDefaultApplicationSettings(): ApplicationSettings {
  return {
    preview: {
      renderer: defaultApplicationSettings.preview.renderer
    },
    workbench: {
      language: defaultApplicationSettings.workbench.language,
      statusBar: {
        visible: defaultApplicationSettings.workbench.statusBar.visible
      }
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
    preview: {
      renderer:
        projectSettings?.preview?.renderer ??
        applicationSettings.preview.renderer ??
        builtInDefaultSettings.preview.renderer
    },
    // The whole workbench area is applicationOnly (#173, #174): Application
    // > Default only, no project scope in the chain. language and
    // statusBar.visible pass straight through (never sparse); fontFamily
    // still falls through to the catalog default when absent.
    workbench: {
      language: applicationSettings.workbench.language,
      statusBar: {
        visible: applicationSettings.workbench.statusBar.visible
      },
      fontFamily:
        applicationSettings.workbench.fontFamily ??
        builtInDefaultSettings.workbench.fontFamily
    }
  };
}
