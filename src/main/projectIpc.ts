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
  type PergamumProject,
  type PergamumProjectConfig,
  type ProjectDocument,
  type ProjectDocumentContent,
  type ReadProjectDocumentRequest,
  type SaveProjectDocumentRequest,
  type SaveProjectDocumentResult
} from "../shared/api";

const projectConfigFileName = "pergamum.json";

interface CurrentProjectState {
  rootPath: string;
  documentRelativePaths: Set<string>;
}

let currentProjectState: CurrentProjectState | null = null;

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

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return undefined;
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
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

async function readProjectConfig(
  rootPath: string
): Promise<PergamumProjectConfig | null> {
  const configPath = path.join(rootPath, projectConfigFileName);
  let rawConfig: string;

  try {
    rawConfig = await fs.readFile(configPath, "utf8");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return null;
    }

    throw new Error(
      `Could not read ${projectConfigFileName}: ${errorDetail(error)}`
    );
  }

  let parsedConfig: unknown;

  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(`Invalid ${projectConfigFileName}: ${errorDetail(error)}`);
  }

  if (!isConfigObject(parsedConfig)) {
    throw new Error(`Invalid ${projectConfigFileName}: expected a JSON object.`);
  }

  const name = parsedConfig.name;

  if (name !== undefined && typeof name !== "string") {
    throw new Error(`Invalid ${projectConfigFileName}: "name" must be a string.`);
  }

  return name === undefined ? {} : { name };
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

export function registerProjectIpc(): void {
  ipcMain.handle(
    PROJECT_CHANNELS.openProject,
    async (event): Promise<PergamumProject | null> => {
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

      const rootPath = result.filePaths[0];
      const config = await readProjectConfig(rootPath);
      const documents = await discoverMarkdownFiles(rootPath);
      currentProjectState = {
        rootPath,
        documentRelativePaths: new Set(
          documents.map((document) => document.relativePath)
        )
      };

      return {
        rootPath,
        name: projectName(rootPath, config),
        config,
        documents
      };
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.readProjectDocument,
    async (
      _event,
      rawRequest: unknown
    ): Promise<ProjectDocumentContent> => {
      const request = parseReadProjectDocumentRequest(rawRequest);
      const documentPath = resolveProjectDocumentPath(request.relativePath);
      const content = await fs.readFile(documentPath, "utf8");

      return {
        relativePath: request.relativePath,
        content
      };
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.saveProjectDocument,
    async (
      _event,
      rawRequest: unknown
    ): Promise<SaveProjectDocumentResult> => {
      const request = parseSaveProjectDocumentRequest(rawRequest);
      const documentPath = resolveProjectDocumentPath(request.relativePath);
      await fs.writeFile(documentPath, request.content, "utf8");

      return {
        relativePath: request.relativePath
      };
    }
  );
}
