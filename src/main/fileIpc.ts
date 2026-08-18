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
import { createEditorIdForPath } from "../shared/editorId";
import { getDebugLogger, type DebugLogger } from "./debugLogger";
import {
  debugLogExtensionForPath,
  debugLogLineCount,
  debugLogLineEndingKind,
  debugLogPathDepth,
  debugLogSizeBucket
} from "./debugLogSanitizer";
import { currentProjectRootPath } from "./projectIpc";

const markdownFilters = [
  {
    name: "Markdown",
    extensions: ["md", "markdown", "mdown", "mkd"]
  }
];

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function documentOpenIdFromRequest(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>).documentOpenId;

  return typeof candidate === "string" ? candidate : undefined;
}

function durationSince(startedAt: number): number {
  return Date.now() - startedAt;
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

function assertStandaloneSaveTargetAllowed(
  filePath: string,
  projectRootPath: string | null
): void {
  if (!projectRootPath) {
    return;
  }

  const editorId = createEditorIdForPath(filePath, {
    rootPath: projectRootPath
  });

  if (editorId.kind === "projectDocument") {
    throw new Error(
      "Standalone save inside the active project is not supported."
    );
  }
}

export function registerFileIpc(logger: DebugLogger = getDebugLogger()): void {
  ipcMain.handle(
    FILE_CHANNELS.openMarkdown,
    async (event, rawRequest: unknown): Promise<MarkdownFile | null> => {
      const startedAt = Date.now();
      const documentOpenId = documentOpenIdFromRequest(rawRequest);
      let filePath: string | null = null;

      try {
        const owner = parentWindow(event);
        const projectRootPath = currentProjectRootPath();
        const options: OpenDialogOptions = {
          title: "Open Markdown File",
          properties: ["openFile"],
          filters: markdownFilters,
          // Starts the chooser in the active project (when one is open)
          // instead of wherever it last was, so explicit Markdown open
          // doesn't force the user to navigate away from their project.
          // Falls back to Electron's own default (last-used directory) when
          // no project is open, matching prior behavior.
          ...(projectRootPath ? { defaultPath: projectRootPath } : {})
        };
        const result = owner
          ? await dialog.showOpenDialog(owner, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }

        filePath = result.filePaths[0];

        const readStartedAt = Date.now();
        const content = await fs.readFile(filePath, "utf8");
        const readDurationMs = durationSince(readStartedAt);

        // Isolates pure file-read + UTF-8 decode cost (#152), excluding the
        // open-dialog interaction time that `startedAt` above still covers.
        logger.log({
          level: "debug",
          event: "document.open.fileRead.completed",
          details: {
            ...(documentOpenId ? { documentOpenId } : {}),
            documentRef: logger.documentRefForKey(filePath),
            extension: debugLogExtensionForPath(filePath),
            pathDepth: debugLogPathDepth(filePath),
            lineCount: debugLogLineCount(content),
            sizeBucket: debugLogSizeBucket(Buffer.byteLength(content, "utf8")),
            fileSizeBytes: Buffer.byteLength(content, "utf8"),
            encodingAssumption: "utf8",
            operation: "open",
            result: "succeeded",
            durationMs: readDurationMs
          }
        });

        return {
          path: filePath,
          content
        };
      } catch (error) {
        const documentRef = filePath
          ? logger.documentRefForKey(filePath)
          : undefined;

        logger.log({
          level: "error",
          event: "document.open.failed",
          details: {
            ...(documentOpenId ? { documentOpenId } : {}),
            ...(documentRef ? { documentRef } : {}),
            editorIdKind: "file",
            pathKind: "unknown",
            extension: filePath ? debugLogExtensionForPath(filePath) : "unknown",
            pathDepth: filePath ? debugLogPathDepth(filePath) : undefined,
            operation: "open",
            result: "failed",
            durationMs: durationSince(startedAt),
            error
          }
        });

        throw error;
      }
    }
  );

  ipcMain.handle(
    FILE_CHANNELS.saveMarkdown,
    async (event, rawRequest: unknown): Promise<SaveMarkdownResult | null> => {
      const startedAt = Date.now();
      let request: SaveMarkdownRequest | null = null;
      let filePath: string | null = null;

      try {
        request = parseSaveRequest(rawRequest);
        filePath = request.path;

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
        assertStandaloneSaveTargetAllowed(filePath, currentProjectRootPath());
        await fs.writeFile(filePath, request.content, "utf8");

        return {
          path: filePath
        };
      } catch (error) {
        const documentRef = filePath
          ? logger.documentRefForKey(filePath)
          : undefined;
        const content = request?.content ?? "";

        logger.log({
          level: "error",
          event: "document.save.failed",
          details: {
            ...(documentRef ? { documentRef } : {}),
            editorIdKind: "file",
            pathKind: "unknown",
            extension: filePath ? debugLogExtensionForPath(filePath) : "unknown",
            pathDepth: filePath ? debugLogPathDepth(filePath) : undefined,
            lineCount: request ? debugLogLineCount(content) : undefined,
            lineEndingKind: request
              ? debugLogLineEndingKind(content)
              : undefined,
            sizeBucket: request
              ? debugLogSizeBucket(Buffer.byteLength(content, "utf8"))
              : undefined,
            encodingAssumption: request ? "utf8" : undefined,
            operation: "save",
            result: "failed",
            durationMs: durationSince(startedAt),
            error
          }
        });

        throw error;
      }
    }
  );
}
