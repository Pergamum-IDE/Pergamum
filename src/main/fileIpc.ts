import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type SaveDialogOptions
} from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  FILE_CHANNELS,
  type MarkdownFile,
  type SaveMarkdownRequest,
  type SaveMarkdownResult
} from "../shared/api";

const markdownFilters = [
  {
    name: "Markdown",
    extensions: ["md", "markdown", "mdown", "mkd"]
  }
];

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function parseSaveRequest(value: unknown): SaveMarkdownRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    !("content" in value) ||
    typeof value.content !== "string"
  ) {
    throw new Error("Invalid save request.");
  }

  const maybePath = "path" in value ? value.path : null;

  if (maybePath !== null && typeof maybePath !== "string") {
    throw new Error("Invalid save path.");
  }

  return {
    path: maybePath,
    content: value.content
  };
}

function ensureMarkdownExtension(filePath: string): string {
  if (path.extname(filePath)) {
    return filePath;
  }

  return `${filePath}.md`;
}

export function registerFileIpc(): void {
  ipcMain.handle(
    FILE_CHANNELS.openMarkdown,
    async (event): Promise<MarkdownFile | null> => {
      const owner = parentWindow(event);
      const options: OpenDialogOptions = {
        title: "Open Markdown File",
        properties: ["openFile"],
        filters: markdownFilters
      };
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      const content = await fs.readFile(filePath, "utf8");

      return {
        path: filePath,
        content
      };
    }
  );

  ipcMain.handle(
    FILE_CHANNELS.saveMarkdown,
    async (event, rawRequest: unknown): Promise<SaveMarkdownResult | null> => {
      const request = parseSaveRequest(rawRequest);
      let filePath = request.path;

      if (!filePath) {
        const owner = parentWindow(event);
        const options: SaveDialogOptions = {
          title: "Save Markdown File",
          defaultPath: "Untitled.md",
          filters: markdownFilters
        };
        const result = owner
          ? await dialog.showSaveDialog(owner, options)
          : await dialog.showSaveDialog(options);

        if (result.canceled || !result.filePath) {
          return null;
        }

        filePath = result.filePath;
      }

      filePath = ensureMarkdownExtension(filePath);
      await fs.writeFile(filePath, request.content, "utf8");

      return {
        path: filePath
      };
    }
  );
}
