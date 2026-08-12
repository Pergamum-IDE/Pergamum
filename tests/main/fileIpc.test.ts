import { beforeEach, describe, expect, it, vi } from "vitest";
import { FILE_CHANNELS } from "../../src/shared/api";

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

function registeredHandler(channel: string): (...args: unknown[]) => unknown {
  registerFileIpc();

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
});
