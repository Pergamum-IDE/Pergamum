export const FILE_CHANNELS = {
  openMarkdown: "files:openMarkdown",
  saveMarkdown: "files:saveMarkdown"
} as const;

export const PROJECT_CHANNELS = {
  openProject: "projects:openProject"
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
  path: string;
  relativePath: string;
  name: string;
}

export interface PergamumProject {
  rootPath: string;
  name: string;
  config: PergamumProjectConfig | null;
  documents: ProjectDocument[];
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
  };
}
