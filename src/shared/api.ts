export const FILE_CHANNELS = {
  openMarkdown: "files:openMarkdown",
  saveMarkdown: "files:saveMarkdown"
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

export interface PergamumApi {
  files: {
    openMarkdown: () => Promise<MarkdownFile | null>;
    saveMarkdown: (
      path: string | null,
      content: string
    ) => Promise<SaveMarkdownResult | null>;
  };
}
