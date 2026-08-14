import type {
  ApplicationSettings,
  ProjectSettings,
  SaveApplicationSettingsRequest
} from "./settings";
import type {
  CreateGlossaryEntryInput,
  GlossaryEntry,
  GlossarySurfaceLookupResult,
  UpdateGlossaryEntryInput
} from "./glossary";

export type {
  ApplicationSettings,
  EffectiveSettings,
  PreviewRendererId,
  ProjectSettings,
  RecentProject,
  SaveApplicationSettingsRequest,
  SettingScope,
  SettingsCatalogEntry,
  SettingsCatalogKey
} from "./settings";
export type {
  CreateGlossaryEntryInput,
  GlossaryEntry,
  GlossaryEntryId,
  GlossaryEntryKind,
  GlossaryForm,
  GlossaryFormId,
  GlossaryFormInput,
  GlossaryFormMatchBoundary,
  GlossaryFormRelation,
  GlossarySurfaceLookupInput,
  GlossarySurfaceLookupResult,
  GlossaryWarningPolicy,
  UpdateGlossaryEntryInput
} from "./glossary";

export const FILE_CHANNELS = {
  openMarkdown: "files:openMarkdown",
  saveMarkdown: "files:saveMarkdown"
} as const;

export const PROJECT_CHANNELS = {
  openProject: "projects:openProject",
  openRecentProject: "projects:openRecentProject",
  readProjectDocument: "projects:readProjectDocument",
  saveProjectDocument: "projects:saveProjectDocument"
} as const;

export const SETTINGS_CHANNELS = {
  getSettings: "settings:getSettings",
  saveSettings: "settings:saveSettings"
} as const;

export const GLOSSARY_CHANNELS = {
  create: "glossary:create",
  getById: "glossary:getById",
  list: "glossary:list",
  lookupSurface: "glossary:lookupSurface",
  update: "glossary:update",
  delete: "glossary:delete"
} as const;

export interface MarkdownFile {
  path: string;
  content: string;
}

export interface SaveMarkdownRequest {
  path: string | null;
  content: string;
}

export interface SaveMarkdownResult {
  path: string;
}

export interface PergamumProjectConfig {
  name?: string;
  settings?: ProjectSettings;
}

export interface ProjectDocument {
  relativePath: string;
  name: string;
}

export interface ReadProjectDocumentRequest {
  relativePath: string;
}

export interface ProjectDocumentContent {
  relativePath: string;
  content: string;
}

export interface SaveProjectDocumentRequest {
  relativePath: string;
  content: string;
}

export interface SaveProjectDocumentResult {
  relativePath: string;
}

export interface PergamumProject {
  rootPath: string;
  name: string;
  config: PergamumProjectConfig | null;
  documents: ProjectDocument[];
}

export interface OpenRecentProjectRequest {
  path: string;
}

export interface GlossaryEntryIdRequest {
  id: string;
}

export interface DeleteGlossaryEntryRequest {
  id: string;
  confirmMessage: string;
}

export interface DeleteGlossaryEntryResult {
  deleted: boolean;
}

export interface GlossarySurfaceLookupRequest {
  surface: string;
}

export interface PergamumApi {
  files: {
    openMarkdown: () => Promise<MarkdownFile | null>;
    saveMarkdown: (
      path: string | null,
      content: string
    ) => Promise<SaveMarkdownResult | null>;
  };
  projects: {
    openProject: () => Promise<PergamumProject | null>;
    openRecentProject: (path: string) => Promise<PergamumProject>;
    readProjectDocument: (
      relativePath: string
    ) => Promise<ProjectDocumentContent>;
    saveProjectDocument: (
      relativePath: string,
      content: string
    ) => Promise<SaveProjectDocumentResult>;
  };
  settings: {
    getSettings: () => Promise<ApplicationSettings>;
    saveSettings: (
      settings: SaveApplicationSettingsRequest
    ) => Promise<ApplicationSettings>;
  };
  glossary: {
    create: (input: CreateGlossaryEntryInput) => Promise<GlossaryEntry>;
    getById: (id: string) => Promise<GlossaryEntry | null>;
    list: () => Promise<GlossaryEntry[]>;
    lookupSurface: (surface: string) => Promise<GlossarySurfaceLookupResult>;
    update: (input: UpdateGlossaryEntryInput) => Promise<GlossaryEntry>;
    delete: (
      id: string,
      confirmMessage: string
    ) => Promise<DeleteGlossaryEntryResult>;
  };
}
