import { beforeEach, describe, expect, it, vi } from "vitest";
import { FILE_CHANNELS } from "../../src/shared/api";
import type { DebugLogger } from "../../src/main/debugLogger";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  fromWebContents: vi.fn(() => undefined),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn()
}));

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

const projectIpcMock = vi.hoisted(() => ({
  currentProjectRootPath: vi.fn<() => string | null>()
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: electronMock.fromWebContents
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
    showSaveDialog: electronMock.showSaveDialog
  },
  ipcMain: {
    handle: electronMock.handle
  }
}));

vi.mock("node:fs", () => ({
  promises: fsMock
}));

vi.mock("../../src/main/projectIpc", () => ({
  currentProjectRootPath: projectIpcMock.currentProjectRootPath
}));

import { registerFileIpc } from "../../src/main/fileIpc";

function buildLoggerMock(): Pick<DebugLogger, "log" | "documentRefForKey"> & {
  log: ReturnType<typeof vi.fn>;
} {
  return {
    log: vi.fn(),
    documentRefForKey: vi.fn(() => "document:session:001")
  };
}

function registeredHandler(
  channel: string,
  logger?: DebugLogger
): (...args: unknown[]) => unknown {
  registerFileIpc(logger);

  const registration = electronMock.handle.mock.calls.find(
    ([registeredChannel]) => registeredChannel === channel
  );

  if (!registration) {
    throw new Error(`Handler was not registered for ${channel}.`);
  }

  return registration[1] as (...args: unknown[]) => unknown;
}

describe("file IPC", () => {
  beforeEach(() => {
    electronMock.handle.mockClear();
    electronMock.showOpenDialog.mockReset();
    electronMock.showSaveDialog.mockReset();
    fsMock.readFile.mockReset();
    fsMock.writeFile.mockReset();
    projectIpcMock.currentProjectRootPath.mockReset();
  });

  it("rejects standalone Save As inside the active project before disk write", async () => {
    projectIpcMock.currentProjectRootPath.mockReturnValue("C:\\Novel");
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: "C:\\Novel\\new-document.md"
    });

    const saveMarkdown = registeredHandler(FILE_CHANNELS.saveMarkdown);

    await expect(
      saveMarkdown(
        {
          sender: {}
        },
        {
          path: null,
          content: "content"
        }
      )
    ).rejects.toThrow(
      "Standalone save inside the active project is not supported."
    );

    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("allows standalone Save As outside the active project", async () => {
    projectIpcMock.currentProjectRootPath.mockReturnValue("C:\\Novel");
    electronMock.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: "D:\\Outside\\new-document.md"
    });
    fsMock.writeFile.mockResolvedValue(undefined);

    const saveMarkdown = registeredHandler(FILE_CHANNELS.saveMarkdown);

    await expect(
      saveMarkdown(
        {
          sender: {}
        },
        {
          path: null,
          content: "content"
        }
      )
    ).resolves.toEqual({
      path: "D:\\Outside\\new-document.md"
    });

    expect(fsMock.writeFile).toHaveBeenCalledWith(
      "D:\\Outside\\new-document.md",
      "content",
      "utf8"
    );
  });

  describe("document.open timing (#152)", () => {
    const manuscriptMarker = "SECRET_MANUSCRIPT_TEXT_MARKER_吾輩は猫である";

    it("logs document.open.fileRead.completed with durationMs, fileSizeBytes, and the propagated documentOpenId on a successful open", async () => {
      const logger = buildLoggerMock();

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ["C:\\Novel\\catfood.md"]
      });
      fsMock.readFile.mockResolvedValue(manuscriptMarker);

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await openMarkdown(
        { sender: {} },
        { documentOpenId: "documentOpen.1" }
      );

      const call = logger.log.mock.calls.find(
        ([entry]) => entry.event === "document.open.fileRead.completed"
      );

      expect(call).toBeTruthy();
      const details = call?.[0].details;

      expect(details.documentOpenId).toBe("documentOpen.1");
      expect(typeof details.durationMs).toBe("number");
      expect(details.fileSizeBytes).toBe(
        Buffer.byteLength(manuscriptMarker, "utf8")
      );
      expect(details.result).toBe("succeeded");
    });

    it("does not include manuscript content anywhere in the logged details", async () => {
      const logger = buildLoggerMock();

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ["C:\\Novel\\catfood.md"]
      });
      fsMock.readFile.mockResolvedValue(manuscriptMarker);

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await openMarkdown(
        { sender: {} },
        { documentOpenId: "documentOpen.1" }
      );

      for (const [entry] of logger.log.mock.calls) {
        expect(JSON.stringify(entry)).not.toContain(manuscriptMarker);
      }
    });

    it("does not include the raw absolute path in the logged details", async () => {
      const logger = buildLoggerMock();
      const rawPath = "C:\\Novel\\my-secret-project\\catfood.md";

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [rawPath]
      });
      fsMock.readFile.mockResolvedValue("content");

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await openMarkdown(
        { sender: {} },
        { documentOpenId: "documentOpen.1" }
      );

      for (const [entry] of logger.log.mock.calls) {
        expect(JSON.stringify(entry)).not.toContain(rawPath);
      }
      expect(logger.documentRefForKey).toHaveBeenCalledWith(rawPath);
    });

    it("omits documentOpenId when the renderer request does not include one, without throwing", async () => {
      const logger = buildLoggerMock();

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ["C:\\Novel\\catfood.md"]
      });
      fsMock.readFile.mockResolvedValue("content");

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await expect(openMarkdown({ sender: {} }, undefined)).resolves.toEqual({
        path: "C:\\Novel\\catfood.md",
        content: "content"
      });

      const call = logger.log.mock.calls.find(
        ([entry]) => entry.event === "document.open.fileRead.completed"
      );

      expect(call?.[0].details.documentOpenId).toBeUndefined();
    });

    it("includes documentOpenId on the existing document.open.failed event when the read fails", async () => {
      const logger = buildLoggerMock();
      const readError = Object.assign(new Error("boom"), { code: "EIO" });

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ["C:\\Novel\\catfood.md"]
      });
      fsMock.readFile.mockRejectedValue(readError);

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await expect(
        openMarkdown({ sender: {} }, { documentOpenId: "documentOpen.7" })
      ).rejects.toThrow("boom");

      const call = logger.log.mock.calls.find(
        ([entry]) => entry.event === "document.open.failed"
      );

      expect(call?.[0].details.documentOpenId).toBe("documentOpen.7");
      expect(call?.[0].details.result).toBe("failed");
    });

    it("does not log a fileRead.completed event when the user cancels the dialog", async () => {
      const logger = buildLoggerMock();

      electronMock.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await expect(
        openMarkdown({ sender: {} }, { documentOpenId: "documentOpen.9" })
      ).resolves.toBeNull();

      expect(logger.log).not.toHaveBeenCalled();
      expect(fsMock.readFile).not.toHaveBeenCalled();
    });
  });

  describe("Open Markdown chooser default directory (#152 follow-up)", () => {
    it("starts the chooser in the active project directory when a project is open", async () => {
      projectIpcMock.currentProjectRootPath.mockReturnValue(
        "C:\\Novel\\my-project"
      );
      electronMock.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const openMarkdown = registeredHandler(FILE_CHANNELS.openMarkdown);

      await openMarkdown({ sender: {} }, {});

      expect(electronMock.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({ defaultPath: "C:\\Novel\\my-project" })
      );
    });

    it("used by both the File menu and Command Palette open paths, since they invoke the same openMarkdown IPC channel — no separate wiring needed", () => {
      // editorCommandIds.openMarkdownDocument (Command Palette / menu) is
      // wired in App.tsx to the same openFile() function that calls
      // window.pergamum.files.openMarkdown(), which invokes this exact
      // handler — so this fix applies to both without extra plumbing.
      expect(FILE_CHANNELS.openMarkdown).toBe("files:openMarkdown");
    });

    it("falls back to no explicit defaultPath (Electron's own default) when no project is open", async () => {
      projectIpcMock.currentProjectRootPath.mockReturnValue(null);
      electronMock.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const openMarkdown = registeredHandler(FILE_CHANNELS.openMarkdown);

      await openMarkdown({ sender: {} }, {});

      const options = electronMock.showOpenDialog.mock.calls[0][0];

      expect(options).not.toHaveProperty("defaultPath");
    });

    it("does not change which files are selectable (filters/properties unaffected)", async () => {
      projectIpcMock.currentProjectRootPath.mockReturnValue("C:\\Novel");
      electronMock.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const openMarkdown = registeredHandler(FILE_CHANNELS.openMarkdown);

      await openMarkdown({ sender: {} }, {});

      expect(electronMock.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: ["openFile"],
          filters: [
            {
              name: "Markdown",
              extensions: ["md", "markdown", "mdown", "mkd"]
            }
          ]
        })
      );
    });

    it("does not log the raw project root path or the raw selected file path", async () => {
      const logger = buildLoggerMock();
      const projectRootPath = "C:\\Users\\name\\my-secret-novel-project";
      const selectedPath = `${projectRootPath}\\chapter1.md`;

      projectIpcMock.currentProjectRootPath.mockReturnValue(projectRootPath);
      electronMock.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [selectedPath]
      });
      fsMock.readFile.mockResolvedValue("content");

      const openMarkdown = registeredHandler(
        FILE_CHANNELS.openMarkdown,
        logger as unknown as DebugLogger
      );

      await openMarkdown({ sender: {} }, { documentOpenId: "documentOpen.5" });

      for (const [entry] of logger.log.mock.calls) {
        expect(JSON.stringify(entry)).not.toContain(projectRootPath);
        expect(JSON.stringify(entry)).not.toContain(selectedPath);
      }
    });
  });
});
