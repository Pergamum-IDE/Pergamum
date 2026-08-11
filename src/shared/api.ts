export const FILE_CHANNELS = {
  openMarkdown: "files:openMarkdown",
  saveMarkdown: "files:saveMarkdown"
} as const;

export const PROJECT_CHANNELS = {
  openProject: "projects:openProject",
  readProjectDocument: "projects:readProjectDocument",
  saveProjectDocument: "projects:saveProjectDocument"
} as const;

export const SETTINGS_CHANNELS = {
  getSettings: "settings:getSettings",
  saveSettings: "settings:saveSettings"
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

export interface ApplicationSettings {
  showStatusBar: boolean;
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
      settings: ApplicationSettings
    ) => Promise<ApplicationSettings>;
  };
}
