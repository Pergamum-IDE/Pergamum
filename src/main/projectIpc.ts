import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type OpenDialogOptions
} from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  PROJECT_CHANNELS,
  type OpenRecentProjectRequest,
  type PergamumProject,
  type PergamumProjectConfig,
  type ProjectDocument,
  type ProjectDocumentContent,
  type ReadProjectDocumentRequest,
  type SaveProjectDocumentRequest,
  type SaveProjectDocumentResult
} from "../shared/api";
import { getDebugLogger, type DebugLogger } from "./debugLogger";
import {
  debugLogExtensionForPath,
  debugLogPathDepth
} from "./debugLogSanitizer";
import { readProjectConfig } from "./projectConfigStore";
import { isRecentProjectPath, recordRecentProject } from "./settingsStore";

interface CurrentProjectState {
  rootPath: string;
  documentRelativePaths: Set<string>;
}

let currentProjectState: CurrentProjectState | null = null;

export function currentProjectRootPath(): string | null {
  return currentProjectState?.rootPath ?? null;
}

export function requireCurrentProjectRootPath(): string {
  if (!currentProjectState) {
    throw new Error("No project is currently open.");
  }

  return currentProjectState.rootPath;
}

function parentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function directoryName(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

function projectName(
  rootPath: string,
  config: PergamumProjectConfig | null
): string {
  const configuredName = config?.name?.trim();
  return configuredName || directoryName(rootPath);
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function durationSince(startedAt: number): number {
  return Date.now() - startedAt;
}

function projectDocumentRefKey(rootPath: string, relativePath: string): string {
  return `${rootPath}\0${relativePath}`;
}

function isRequestObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReadProjectDocumentRequest(
  value: unknown
): ReadProjectDocumentRequest {
  if (!isRequestObject(value) || typeof value.relativePath !== "string") {
    throw new Error("Invalid project document read request.");
  }

  return {
    relativePath: value.relativePath
  };
}

function parseSaveProjectDocumentRequest(
  value: unknown
): SaveProjectDocumentRequest {
  if (
    !isRequestObject(value) ||
    typeof value.relativePath !== "string" ||
    typeof value.content !== "string"
  ) {
    throw new Error("Invalid project document save request.");
  }

  return {
    relativePath: value.relativePath,
    content: value.content
  };
}

function parseOpenRecentProjectRequest(
  value: unknown
): OpenRecentProjectRequest {
  if (
    !isRequestObject(value) ||
    typeof value.path !== "string" ||
    value.path.length === 0
  ) {
    throw new Error("Invalid recent project open request.");
  }

  return {
    path: value.path
  };
}

function resolveProjectDocumentPath(relativePath: string): string {
  if (!currentProjectState) {
    throw new Error("No project is currently open.");
  }

  if (!currentProjectState.documentRelativePaths.has(relativePath)) {
    throw new Error("Project document is not part of the current project.");
  }

  const resolvedPath = path.resolve(currentProjectState.rootPath, relativePath);
  const resolvedRelativePath = path.relative(
    currentProjectState.rootPath,
    resolvedPath
  );

  if (
    resolvedRelativePath.startsWith("..") ||
    path.isAbsolute(resolvedRelativePath)
  ) {
    throw new Error("Project document path is outside the current project.");
  }

  return resolvedPath;
}

async function discoverMarkdownFiles(
  rootPath: string
): Promise<ProjectDocument[]> {
  const documents: ProjectDocument[] = [];

  async function walk(directoryPath: string): Promise<void> {
    const entries = await fs.readdir(directoryPath, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
        continue;
      }

      documents.push({
        relativePath: normalizeRelativePath(path.relative(rootPath, entryPath)),
        name: entry.name
      });
    }
  }

  try {
    await walk(rootPath);
  } catch (error) {
    throw new Error(`Could not discover Markdown files: ${errorDetail(error)}`);
  }

  return documents.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
}

async function recordProjectRecently(project: PergamumProject): Promise<void> {
  try {
    await recordRecentProject({
      path: project.rootPath,
      name: project.name
    });
  } catch (error) {
    console.warn(`Could not record recent project: ${errorDetail(error)}`);
  }
}

async function openProjectRoot(
  rootPath: string,
  logger: DebugLogger
): Promise<PergamumProject> {
  const startedAt = Date.now();
  const projectRef = logger.projectRefForKey(rootPath);

  try {
    const config = await readProjectConfig(rootPath);
    const documents = await discoverMarkdownFiles(rootPath);
    const project: PergamumProject = {
      rootPath,
      name: projectName(rootPath, config),
      config,
      documents
    };

    currentProjectState = {
      rootPath: project.rootPath,
      documentRelativePaths: new Set(
        project.documents.map((document) => document.relativePath)
      )
    };

    await recordProjectRecently(project);

    logger.log({
      level: "info",
      event: "project.open.succeeded",
      details: {
        projectRef,
        operation: "open",
        result: "succeeded",
        durationMs: durationSince(startedAt)
      }
    });

    return project;
  } catch (error) {
    logger.log({
      level: "error",
      event: "project.open.failed",
      details: {
        projectRef,
        operation: "open",
        result: "failed",
        durationMs: durationSince(startedAt),
        error
      }
    });

    throw error;
  }
}

export function registerProjectIpc(
  logger: DebugLogger = getDebugLogger()
): void {
  ipcMain.handle(
    PROJECT_CHANNELS.openProject,
    async (event): Promise<PergamumProject | null> => {
      const startedAt = Date.now();
      let rootPath: string | null = null;

      try {
        const owner = parentWindow(event);
        const options: OpenDialogOptions = {
          title: "Open Pergamum Project",
          properties: ["openDirectory"]
        };
        const result = owner
          ? await dialog.showOpenDialog(owner, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }

        rootPath = result.filePaths[0];
      } catch (error) {
        logger.log({
          level: "error",
          event: "project.open.failed",
          details: {
            operation: "open",
            result: "failed",
            durationMs: durationSince(startedAt),
            error
          }
        });

        throw error;
      }

      return openProjectRoot(rootPath, logger);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.openRecentProject,
    async (
      _event,
      rawRequest: unknown
    ): Promise<PergamumProject> => {
      const startedAt = Date.now();
      let request: OpenRecentProjectRequest;

      try {
        request = parseOpenRecentProjectRequest(rawRequest);
        const isRegisteredRecentProject = await isRecentProjectPath(
          request.path
        );

        if (!isRegisteredRecentProject) {
          throw new Error("Recent project is not registered.");
        }

        return openProjectRoot(request.path, logger);
      } catch (error) {
        logger.log({
          level: "error",
          event: "project.open.failed",
          details: {
            operation: "open",
            result: "failed",
            durationMs: durationSince(startedAt),
            error
          }
        });

        throw error;
      }

      return openProjectRoot(request.path, logger);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.readProjectDocument,
    async (
      _event,
      rawRequest: unknown
    ): Promise<ProjectDocumentContent> => {
      const startedAt = Date.now();
      let request: ReadProjectDocumentRequest | null = null;

      try {
        request = parseReadProjectDocumentRequest(rawRequest);
        const documentPath = resolveProjectDocumentPath(request.relativePath);
        const content = await fs.readFile(documentPath, "utf8");

        return {
          relativePath: request.relativePath,
          content
        };
      } catch (error) {
        const rootPath = currentProjectState?.rootPath;
        const documentRef =
          rootPath && request
            ? logger.documentRefForKey(
                projectDocumentRefKey(rootPath, request.relativePath)
              )
            : undefined;
        const projectRef = rootPath
          ? logger.projectRefForKey(rootPath)
          : undefined;

        logger.log({
          level: "error",
          event: "document.open.failed",
          details: {
            ...(projectRef ? { projectRef } : {}),
            ...(documentRef ? { documentRef } : {}),
            pathKind: "projectFile",
            extension: request
              ? debugLogExtensionForPath(request.relativePath)
              : "unknown",
            pathDepth: request
              ? debugLogPathDepth(request.relativePath)
              : undefined,
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
    PROJECT_CHANNELS.saveProjectDocument,
    async (
      _event,
      rawRequest: unknown
    ): Promise<SaveProjectDocumentResult> => {
      const startedAt = Date.now();
      let request: SaveProjectDocumentRequest | null = null;

      try {
        request = parseSaveProjectDocumentRequest(rawRequest);
        const documentPath = resolveProjectDocumentPath(request.relativePath);
        await fs.writeFile(documentPath, request.content, "utf8");

        return {
          relativePath: request.relativePath
        };
      } catch (error) {
        const rootPath = currentProjectState?.rootPath;
        const documentRef =
          rootPath && request
            ? logger.documentRefForKey(
                projectDocumentRefKey(rootPath, request.relativePath)
              )
            : undefined;
        const projectRef = rootPath
          ? logger.projectRefForKey(rootPath)
          : undefined;

        logger.log({
          level: "error",
          event: "document.save.failed",
          details: {
            ...(projectRef ? { projectRef } : {}),
            ...(documentRef ? { documentRef } : {}),
            pathKind: "projectFile",
            extension: request
              ? debugLogExtensionForPath(request.relativePath)
              : "unknown",
            pathDepth: request
              ? debugLogPathDepth(request.relativePath)
              : undefined,
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
