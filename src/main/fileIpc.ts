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
  type SaveMarkdownResult,
  type SelectMarkdownSavePathRequest,
  type SelectMarkdownSavePathResult,
  type WriteMarkdownRequest,
  type WriteMarkdownResult
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
import {
  decodeMarkdownBytes,
  markdownWriteMetadata,
  sanitizedFileIoError
} from "./markdownFileIo";
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

function parseSelectMarkdownSavePathRequest(
  value: unknown
): SelectMarkdownSavePathRequest {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid save path selection request.");
  }

  const maybeDefaultPath = "defaultPath" in value ? value.defaultPath : null;
  if (maybeDefaultPath !== null && typeof maybeDefaultPath !== "string") {
    throw new Error("Invalid default save path.");
  }

  return {
    defaultPath: maybeDefaultPath
  };
}

function parseWriteMarkdownRequest(value: unknown): WriteMarkdownRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    !("path" in value) ||
    typeof value.path !== "string" ||
    !("content" in value) ||
    typeof value.content !== "string"
  ) {
    throw new Error("Invalid markdown write request.");
  }

  return {
    path: value.path,
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
    const error = new Error(
      "Standalone save inside the active project is not supported."
    ) as Error & { code: string };
    error.code = "ERR_UNSUPPORTED_SAVE_TARGET";

    throw error;
  }
}

async function selectMarkdownSavePath(
  event: IpcMainInvokeEvent,
  request: SelectMarkdownSavePathRequest
): Promise<SelectMarkdownSavePathResult | null> {
  const owner = parentWindow(event);
  const options: SaveDialogOptions = {
    title: "Save Markdown File",
    defaultPath: request.defaultPath ?? "Untitled.md",
    filters: markdownFilters
  };
  const result = owner
    ? await dialog.showSaveDialog(owner, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = ensureMarkdownExtension(result.filePath);
  assertStandaloneSaveTargetAllowed(filePath, currentProjectRootPath());

  return {
    path: filePath
  };
}

async function writeStandaloneMarkdown(
  filePath: string,
  content: string,
  logger: DebugLogger,
  startedAt: number
): Promise<WriteMarkdownResult> {
  const normalizedPath = ensureMarkdownExtension(filePath);
  assertStandaloneSaveTargetAllowed(normalizedPath, currentProjectRootPath());
  const metadata = markdownWriteMetadata(content);

  await fs.writeFile(normalizedPath, content, "utf8");

  logger.log({
    level: "debug",
    event: "save.succeeded",
    details: {
      documentRef: logger.documentRefForKey(normalizedPath),
      editorIdKind: "file",
      saveTargetKind: "standaloneMarkdown",
      pathKind: "unknown",
      extension: debugLogExtensionForPath(normalizedPath),
      pathDepth: debugLogPathDepth(normalizedPath),
      lineCount: debugLogLineCount(content),
      lineEndingKind: metadata.lineEnding,
      sizeBucket: debugLogSizeBucket(metadata.byteLength),
      byteLength: metadata.byteLength,
      characterLength: metadata.characterLength,
      encodingAssumption: metadata.encoding,
      operation: "write",
      result: "succeeded",
      durationMs: durationSince(startedAt)
    }
  });

  return {
    path: normalizedPath,
    encoding: metadata.encoding,
    lineEnding: metadata.lineEnding,
    byteLength: metadata.byteLength,
    characterLength: metadata.characterLength
  };
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
        const bytes = await fs.readFile(filePath);
        const decoded = decodeMarkdownBytes(bytes);
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
            lineCount: debugLogLineCount(decoded.content),
            lineEndingKind: decoded.lineEnding,
            sizeBucket: debugLogSizeBucket(decoded.byteLength),
            fileSizeBytes: decoded.byteLength,
            byteLength: decoded.byteLength,
            characterLength: decoded.characterLength,
            hadBom: decoded.hadBom,
            encodingAssumption: decoded.encoding,
            operation: "read",
            result: "succeeded",
            durationMs: readDurationMs
          }
        });

        return {
          path: filePath,
          content: decoded.content,
          metadata: {
            encoding: decoded.encoding,
            lineEnding: decoded.lineEnding,
            byteLength: decoded.byteLength,
            characterLength: decoded.characterLength,
            hadBom: decoded.hadBom
          }
        };
      } catch (error) {
        const safeError = sanitizedFileIoError(error);
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
            saveTargetKind: "standaloneMarkdown",
            pathKind: "unknown",
            extension: filePath ? debugLogExtensionForPath(filePath) : "unknown",
            pathDepth: filePath ? debugLogPathDepth(filePath) : undefined,
            operation: "read",
            result: "failed",
            reason: safeError.reason,
            durationMs: durationSince(startedAt),
            error: safeError
          }
        });

        throw safeError;
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
          const selectedPath = await selectMarkdownSavePath(event, {
            defaultPath: null
          });

          if (!selectedPath) {
            return null;
          }

          filePath = selectedPath.path;
        }

        const result = await writeStandaloneMarkdown(
          filePath,
          request.content,
          logger,
          startedAt
        );

        return {
          path: result.path
        };
      } catch (error) {
        const safeError = sanitizedFileIoError(error);
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
            saveTargetKind: "standaloneMarkdown",
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
            byteLength: request
              ? Buffer.byteLength(content, "utf8")
              : undefined,
            characterLength: request ? content.length : undefined,
            encodingAssumption: request ? "utf8" : undefined,
            operation: "write",
            result: "failed",
            reason: safeError.reason,
            durationMs: durationSince(startedAt),
            error: safeError
          }
        });

        throw safeError;
      }
    }
  );

  ipcMain.handle(
    FILE_CHANNELS.selectMarkdownSavePath,
    async (
      event,
      rawRequest: unknown
    ): Promise<SelectMarkdownSavePathResult | null> => {
      try {
        return await selectMarkdownSavePath(
          event,
          parseSelectMarkdownSavePathRequest(rawRequest)
        );
      } catch (error) {
        const safeError = sanitizedFileIoError(error);
        throw safeError;
      }
    }
  );

  ipcMain.handle(
    FILE_CHANNELS.writeMarkdown,
    async (_event, rawRequest: unknown): Promise<WriteMarkdownResult> => {
      const startedAt = Date.now();
      let request: WriteMarkdownRequest | null = null;
      let filePath: string | null = null;

      try {
        request = parseWriteMarkdownRequest(rawRequest);
        filePath = request.path;

        return await writeStandaloneMarkdown(
          filePath,
          request.content,
          logger,
          startedAt
        );
      } catch (error) {
        const safeError = sanitizedFileIoError(error);
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
            saveTargetKind: "standaloneMarkdown",
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
            byteLength: request
              ? Buffer.byteLength(content, "utf8")
              : undefined,
            characterLength: request ? content.length : undefined,
            encodingAssumption: request ? "utf8" : undefined,
            operation: "write",
            result: "failed",
            reason: safeError.reason,
            durationMs: durationSince(startedAt),
            error: safeError
          }
        });

        throw safeError;
      }
    }
  );
}
