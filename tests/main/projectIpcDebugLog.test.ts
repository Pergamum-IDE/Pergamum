import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_CHANNELS } from "../../src/shared/api";
import type { DebugLogger } from "../../src/main/debugLogger";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  fromWebContents: vi.fn(() => undefined),
  showOpenDialog: vi.fn(),
  getPath: vi.fn()
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: electronMock.fromWebContents
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog
  },
  ipcMain: {
    handle: electronMock.handle
  },
  app: {
    getPath: electronMock.getPath
  }
}));

import { registerProjectIpc } from "../../src/main/projectIpc";

describe("project IPC debug logging", () => {
  let projectRootPath: string;
  let userDataPath: string;

  beforeEach(async () => {
    electronMock.handle.mockClear();
    electronMock.fromWebContents.mockReset().mockReturnValue(undefined);
    electronMock.showOpenDialog.mockReset();
    electronMock.getPath.mockReset();
    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-project-ipc-debug-")
    );
    userDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-project-ipc-user-data-")
    );
    electronMock.getPath.mockReturnValue(userDataPath);
    await fs.writeFile(path.join(projectRootPath, "known.md"), "# Known\n");
  });

  afterEach(async () => {
    await fs.rm(projectRootPath, {
      recursive: true,
      force: true
    });
    await fs.rm(userDataPath, {
      recursive: true,
      force: true
    });
  });

  it("logs a nonexistent project document open failure exactly once", async () => {
    const logger = createLoggerMock();
    registerProjectIpc(logger);
    electronMock.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [projectRootPath]
    });

    const openProject = registeredHandler(PROJECT_CHANNELS.openProject);
    await openProject({ sender: {} });
    logger.log.mockClear();

    const readProjectDocument = registeredHandler(
      PROJECT_CHANNELS.readProjectDocument
    );
    await expect(
      readProjectDocument(
        { sender: {} },
        { relativePath: "missing-secret-title.md" }
      )
    ).rejects.toThrow();

    const documentOpenFailureLogs = logger.log.mock.calls
      .map(([input]) => input)
      .filter((input) => input.event === "document.open.failed");

    expect(documentOpenFailureLogs).toHaveLength(1);
    expect(documentOpenFailureLogs[0]).toMatchObject({
      level: "error",
      event: "document.open.failed",
      details: {
        projectRef: "project:session:001",
        documentRef: "document:session:001",
        pathKind: "projectFile",
        extension: ".md",
        pathDepth: 1,
        operation: "open",
        result: "failed"
      }
    });
    expect(JSON.stringify(documentOpenFailureLogs[0].details)).not.toContain(
      "missing-secret-title"
    );
  });
});

function createLoggerMock(): DebugLogger & {
  log: ReturnType<typeof vi.fn>;
} {
  return {
    enabled: true,
    sessionId: "session",
    currentFilePath: null,
    log: vi.fn(),
    logRendererRequest: vi.fn(),
    openFileSink: vi.fn(),
    flushAndClose: vi.fn(),
    projectRefForKey: vi.fn(() => "project:session:001"),
    documentRefForKey: vi.fn(() => "document:session:001"),
    isKnownProjectRef: vi.fn(() => true),
    isKnownDocumentRef: vi.fn(() => true)
  };
}

function registeredHandler(channel: string): (...args: unknown[]) => unknown {
  const registration = electronMock.handle.mock.calls.find(
    ([registeredChannel]) => registeredChannel === channel
  );

  if (!registration) {
    throw new Error(`Handler was not registered for ${channel}.`);
  }

  return registration[1] as (...args: unknown[]) => unknown;
}

