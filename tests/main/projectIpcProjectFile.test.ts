import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_CHANNELS } from "../../src/shared/api";
import type { DebugLogger } from "../../src/main/debugLogger";
import { projectConfigFileName } from "../../src/main/projectConfigStore";
import {
  createProjectDatabase,
  openProjectDatabase,
  projectDatabaseFileName,
  readProjectMetadata
} from "../../src/main/projectDatabase";
import type { Mock } from "vitest";

type DebugLoggerMock = DebugLogger & {
  log: Mock<DebugLogger["log"]>;
};

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  fromWebContents: vi.fn(() => undefined),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showMessageBox: vi.fn(),
  getPath: vi.fn()
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: electronMock.fromWebContents
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
    showSaveDialog: electronMock.showSaveDialog,
    showMessageBox: electronMock.showMessageBox
  },
  ipcMain: {
    handle: electronMock.handle
  },
  app: {
    getPath: electronMock.getPath
  }
}));

import {
  currentActiveProjectFilePath,
  currentProjectRootPath,
  registerProjectIpc
} from "../../src/main/projectIpc";

const projectConflictWarningMessage =
  "既に Pergamum のプロジェクト設定または復旧領域があります。\n\n" +
  "既存の設定を上書きし、本文やGlossaryに関する復旧領域があるフォルダに新しいプロジェクトを作成します。\n\n" +
  "これは破壊的な変更を伴います。\n" +
  "本当によろしいですか？";

describe("project file IPC foundation", () => {
  let projectRootPath: string;
  let userDataPath: string;

  beforeEach(async () => {
    electronMock.handle.mockClear();
    electronMock.fromWebContents.mockReset().mockReturnValue(undefined);
    electronMock.showOpenDialog.mockReset();
    electronMock.showSaveDialog.mockReset();
    electronMock.showMessageBox.mockReset();
    electronMock.getPath.mockReset();

    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-project-file-ipc-")
    );
    userDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-project-file-ipc-user-data-")
    );
    electronMock.getPath.mockReturnValue(userDataPath);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(projectRootPath, {
      recursive: true,
      force: true
    });
    await fs.rm(userDataPath, {
      recursive: true,
      force: true
    });
  });

  it("registers Create Project and Open Project File IPC channels", () => {
    registerProjectIpc(createLoggerMock());

    expect(electronMock.handle.mock.calls.map(([channel]) => channel)).toEqual(
      expect.arrayContaining([
        PROJECT_CHANNELS.createProject,
        PROJECT_CHANNELS.openProjectFile,
        PROJECT_CHANNELS.openProject
      ])
    );
  });

  it("createProject returns null when the save dialog is canceled", async () => {
    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject
    );
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: true
    });

    await expect(createProjectHandler({ sender: {} })).resolves.toBeNull();

    expect(electronMock.showMessageBox).not.toHaveBeenCalled();
  });

  it("createProject safely rejects a selected path without the .pergamum extension", async () => {
    const projectFilePath = path.join(projectRootPath, "Wrong Secret.txt");
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject
    );

    await expect(createProjectHandler({ sender: {} })).resolves.toBeNull();

    await expect(fs.access(projectFilePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    expectDialogHasNoUnsafeSurface([
      projectRootPath,
      projectFilePath,
      "Wrong Secret.txt",
      "Wrong Secret"
    ]);
  });

  it("createProject creates a .pergamum DB, writes metadata, and activates the selected file", async () => {
    const logger = createLoggerMock();
    const projectFilePath = path.join(projectRootPath, "Secret Draft.pergamum");
    await fs.writeFile(
      path.join(projectRootPath, "chapter-01.md"),
      "# Chapter\n"
    );
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject,
      logger
    );
    const project = await createProjectHandler({ sender: {} });

    expect(project).toMatchObject({
      rootPath: projectRootPath,
      activeProjectFilePath: path.resolve(projectFilePath),
      name: "Secret Draft",
      config: {
        name: "Secret Draft"
      },
      documents: [
        {
          relativePath: "chapter-01.md",
          name: "chapter-01.md"
        }
      ]
    });
    expect(currentProjectRootPath()).toBe(projectRootPath);
    expect(currentActiveProjectFilePath()).toBe(path.resolve(projectFilePath));

    const database = await openProjectDatabase(projectFilePath);
    try {
      const metadata = await readProjectMetadata(database);
      expect(metadata.projectName).toBe("Secret Draft");
    } finally {
      await database.close();
    }

    await expect(
      fs.readFile(path.join(projectRootPath, projectConfigFileName), "utf8")
    ).resolves.toBe('{\n  "name": "Secret Draft"\n}\n');
    expectNoUnsafeSurface(logger, [
      projectRootPath,
      projectFilePath,
      "Secret Draft.pergamum",
      "Secret Draft"
    ]);
  });

  it("createProject refuses to overwrite an existing .pergamum file", async () => {
    const projectFilePath = path.join(
      projectRootPath,
      "Existing Secret.pergamum"
    );
    await fs.writeFile(projectFilePath, "existing content", "utf8");
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject
    );

    await expect(createProjectHandler({ sender: {} })).resolves.toBeNull();

    await expect(fs.readFile(projectFilePath, "utf8")).resolves.toBe(
      "existing content"
    );
    expect(electronMock.showMessageBox).toHaveBeenCalledTimes(1);
    expectDialogHasNoUnsafeSurface([
      projectRootPath,
      projectFilePath,
      "Existing Secret.pergamum",
      "Existing Secret"
    ]);
  });

  it.each([
    [
      "project config",
      async (rootPath: string) => {
        await fs.writeFile(
          path.join(rootPath, projectConfigFileName),
          '{"name":"old"}\n',
          "utf8"
        );
      }
    ],
    [
      "project recovery directory",
      async (rootPath: string) => {
        await fs.mkdir(path.join(rootPath, ".pergamum_recovery"));
      }
    ]
  ] as const)(
    "createProject shows a warning confirmation when an existing %s is found",
    async (_label, seedConflict) => {
      const projectFilePath = path.join(projectRootPath, "Warned.pergamum");
      await seedConflict(projectRootPath);
      electronMock.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: projectFilePath
      });
      electronMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false
      });

      const createProjectHandler = registeredHandler(
        PROJECT_CHANNELS.createProject
      );

      await expect(createProjectHandler({ sender: {} })).resolves.toBeNull();

      expect(electronMock.showMessageBox).toHaveBeenCalledTimes(1);
      const options = electronMock.showMessageBox.mock.calls[0].at(-1);

      expect(options).toMatchObject({
        type: "warning",
        message: projectConflictWarningMessage,
        buttons: ["意味を理解して同意", "キャンセル"],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      });
      expectDialogHasNoUnsafeSurface([
        projectRootPath,
        projectFilePath,
        "Warned.pergamum",
        "Warned"
      ]);
      await expect(fs.access(projectFilePath)).rejects.toMatchObject({
        code: "ENOENT"
      });
    }
  );

  it("createProject warning cancel creates neither DB nor pergamum.json", async () => {
    const projectFilePath = path.join(
      projectRootPath,
      "Cancel Warned.pergamum"
    );
    await fs.mkdir(path.join(projectRootPath, ".pergamum_recovery"));
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });
    electronMock.showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject
    );

    await expect(createProjectHandler({ sender: {} })).resolves.toBeNull();
    await expect(fs.access(projectFilePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(
      fs.access(path.join(projectRootPath, projectConfigFileName))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("createProject warning confirm proceeds and overwrites pergamum.json", async () => {
    const projectFilePath = path.join(projectRootPath, "Confirmed.pergamum");
    await fs.writeFile(
      path.join(projectRootPath, projectConfigFileName),
      '{"name":"old"}\n',
      "utf8"
    );
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });
    electronMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject
    );
    const project = await createProjectHandler({ sender: {} });

    expect(project).toMatchObject({
      rootPath: projectRootPath,
      activeProjectFilePath: path.resolve(projectFilePath),
      name: "Confirmed"
    });
    await expect(fs.access(projectFilePath)).resolves.toBeUndefined();
    await expect(
      fs.readFile(path.join(projectRootPath, projectConfigFileName), "utf8")
    ).resolves.toBe('{\n  "name": "Confirmed"\n}\n');
  });

  it("openProjectFile returns null when the open dialog is canceled", async () => {
    const openProjectFileHandler = registeredHandler(
      PROJECT_CHANNELS.openProjectFile
    );
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: []
    });

    await expect(openProjectFileHandler({ sender: {} })).resolves.toBeNull();
  });

  it("openProjectFile safely rejects a selected path without the .pergamum extension", async () => {
    const projectFilePath = path.join(projectRootPath, "Wrong Open Secret.txt");
    await fs.writeFile(projectFilePath, "not a project", "utf8");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [projectFilePath]
    });

    const openProjectFileHandler = registeredHandler(
      PROJECT_CHANNELS.openProjectFile
    );

    await expect(openProjectFileHandler({ sender: {} })).resolves.toBeNull();

    expectDialogHasNoUnsafeSurface([
      projectRootPath,
      projectFilePath,
      "Wrong Open Secret.txt",
      "Wrong Open Secret"
    ]);
  });

  it("openProjectFile opens a valid .pergamum file and uses DB metadata as the project name", async () => {
    const projectFilePath = path.join(
      projectRootPath,
      "Filename Label.pergamum"
    );
    const created = await createProjectDatabase({
      projectFilePath,
      projectName: "Metadata Project Name"
    });
    await created.close();
    await fs.writeFile(
      path.join(projectRootPath, projectConfigFileName),
      '{"name":"Config Name"}\n',
      "utf8"
    );
    await fs.writeFile(path.join(projectRootPath, "chapter.md"), "# Chapter\n");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [projectFilePath]
    });

    const openProjectFileHandler = registeredHandler(
      PROJECT_CHANNELS.openProjectFile
    );
    const project = await openProjectFileHandler({ sender: {} });

    expect(project).toMatchObject({
      rootPath: projectRootPath,
      activeProjectFilePath: path.resolve(projectFilePath),
      name: "Metadata Project Name",
      config: {
        name: "Config Name"
      },
      documents: [
        {
          relativePath: "chapter.md",
          name: "chapter.md"
        }
      ]
    });
    expect(currentProjectRootPath()).toBe(projectRootPath);
    expect(currentActiveProjectFilePath()).toBe(path.resolve(projectFilePath));
  });

  it("openProjectFile rejects invalid .pergamum without migration or repair", async () => {
    const logger = createLoggerMock();
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const projectFilePath = path.join(
      projectRootPath,
      "Invalid Secret.pergamum"
    );
    const emptyDatabase = new Database(projectFilePath);
    emptyDatabase.close();
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [projectFilePath]
    });

    const openProjectFileHandler = registeredHandler(
      PROJECT_CHANNELS.openProjectFile,
      logger
    );

    await expectSanitizedProjectRejection(
      openProjectFileHandler({ sender: {} }) as Promise<unknown>,
      "unknown",
      [projectRootPath, projectFilePath, "Invalid Secret.pergamum"]
    );

    const verifyDatabase = new Database(projectFilePath);
    const userVersion = verifyDatabase.pragma("user_version", {
      simple: true
    });
    const tables = verifyDatabase
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all();
    verifyDatabase.close();

    expect(userVersion).toBe(0);
    expect(tables).toEqual([]);
    expectNoUnsafeSurface(logger, [
      projectRootPath,
      projectFilePath,
      "Invalid Secret.pergamum"
    ]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("directory-based openProject remains compatible and keeps pergamum.db as the active project file", async () => {
    const projectRootName = path.basename(projectRootPath);
    await fs.writeFile(path.join(projectRootPath, "known.md"), "# Known\n");
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [projectRootPath]
    });

    const openProjectHandler = registeredHandler(PROJECT_CHANNELS.openProject);
    const project = await openProjectHandler({ sender: {} });

    expect(project).toMatchObject({
      rootPath: projectRootPath,
      activeProjectFilePath: path.join(
        projectRootPath,
        projectDatabaseFileName
      ),
      name: projectRootName,
      documents: [
        {
          relativePath: "known.md",
          name: "known.md"
        }
      ]
    });
  });

  it("createProject sanitizes raw write errors in logs and console output", async () => {
    const logger = createLoggerMock();
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const projectFilePath = path.join(projectRootPath, "Leaky Secret.pergamum");
    const rawError = Object.assign(
      new Error(
        `EACCES: denied '${projectFilePath}' '${projectConfigFileName}' Leaky Secret`
      ),
      {
        code: "EACCES",
        path: projectFilePath
      }
    );
    const writeFileSpy = vi
      .spyOn(fs, "writeFile")
      .mockRejectedValueOnce(rawError);
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: projectFilePath
    });

    const createProjectHandler = registeredHandler(
      PROJECT_CHANNELS.createProject,
      logger
    );

    await expectSanitizedProjectRejection(
      createProjectHandler({ sender: {} }) as Promise<unknown>,
      "permissionDenied",
      [
        projectRootPath,
        projectFilePath,
        "Leaky Secret.pergamum",
        projectConfigFileName,
        "Leaky Secret",
        "EACCES"
      ]
    );

    writeFileSpy.mockRestore();
    expectNoUnsafeSurface(logger, [
      projectRootPath,
      projectFilePath,
      "Leaky Secret.pergamum",
      projectConfigFileName,
      "Leaky Secret",
      "EACCES"
    ]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

function createLoggerMock(): DebugLogger & {
  log: ReturnType<typeof vi.fn>;
} {
  return {
    enabled: true,
    sessionId: "session",
    currentFilePath: null,
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    log: vi.fn<DebugLogger["log"]>(),
    logRendererRequest: vi.fn(),
    openFileSink: vi.fn(),
    flushAndClose: vi.fn(),
    projectRefForKey: vi.fn(() => "project:session:001"),
    documentRefForKey: vi.fn(() => "document:session:001"),
    isKnownProjectRef: vi.fn(() => true),
    isKnownDocumentRef: vi.fn(() => true)
  };
}

function registeredHandler(
  channel: string,
  logger: DebugLogger = createLoggerMock()
): (...args: unknown[]) => unknown {
  registerProjectIpc(logger);

  const registration = electronMock.handle.mock.calls.find(
    ([registeredChannel]) => registeredChannel === channel
  );

  if (!registration) {
    throw new Error(`Handler was not registered for ${channel}.`);
  }

  return registration[1] as (...args: unknown[]) => unknown;
}

async function expectSanitizedProjectRejection(
  promise: Promise<unknown>,
  reason: string,
  disallowedText: readonly string[]
): Promise<void> {
  const rejection = await promise.then(
    () => {
      throw new Error("Expected promise to reject.");
    },
    (error: unknown) => error
  );

  expect(rejection).toMatchObject({
    name: "PergamumFileIoError",
    message: `File I/O failed: ${reason}`,
    code: "PERGAMUM_FILE_IO_FAILED",
    reason
  });

  const safeErrorSurface = `${String(rejection)}\n${JSON.stringify(rejection)}`;

  for (const text of disallowedText) {
    expect(safeErrorSurface).not.toContain(text);
  }
}

function expectNoUnsafeSurface(
  logger: { log: ReturnType<typeof vi.fn> },
  disallowedText: readonly string[]
): void {
  const serializedLogs = JSON.stringify(
    logger.log.mock.calls.map(([entry]) => entry)
  );

  for (const text of disallowedText) {
    expect(serializedLogs).not.toContain(text);
  }
}

function expectDialogHasNoUnsafeSurface(
  disallowedText: readonly string[]
): void {
  const serializedDialogs = JSON.stringify(
    electronMock.showMessageBox.mock.calls
  );

  for (const text of disallowedText) {
    expect(serializedDialogs).not.toContain(text);
  }
}
