import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLOSSARY_CHANNELS } from "../../src/shared/api";
import {
  GlossaryValidationError,
  type GlossaryEntry,
  type GlossaryForm
} from "../../src/shared/glossary";
import { projectDatabaseFileName } from "../../src/main/projectDatabase";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
  fromWebContents: vi.fn(() => undefined),
  showMessageBox: vi.fn()
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: electronMock.fromWebContents
  },
  dialog: {
    showMessageBox: electronMock.showMessageBox
  },
  ipcMain: {
    handle: electronMock.handle
  }
}));

import {
  createGlossaryIpcHandlers,
  registerGlossaryIpc
} from "../../src/main/glossaryIpc";

const missingEntryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";
const confirmMessage = "この語彙を削除します。よろしいですか？";

describe("glossary IPC", () => {
  let projectRootPath: string;
  let activeProjectFilePath: string;

  beforeEach(async () => {
    electronMock.handle.mockClear();
    electronMock.fromWebContents.mockReset().mockReturnValue(undefined);
    electronMock.showMessageBox.mockReset();
    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-glossary-ipc-")
    );
    activeProjectFilePath = path.join(projectRootPath, projectDatabaseFileName);
  });

  afterEach(async () => {
    await fs.rm(projectRootPath, {
      recursive: true,
      force: true
    });
  });

  it("registers glossary IPC channels", () => {
    registerGlossaryIpc();

    expect(electronMock.handle.mock.calls.map(([channel]) => channel)).toEqual([
      GLOSSARY_CHANNELS.create,
      GLOSSARY_CHANNELS.getById,
      GLOSSARY_CHANNELS.list,
      GLOSSARY_CHANNELS.lookupSurface,
      GLOSSARY_CHANNELS.update,
      GLOSSARY_CHANNELS.delete
    ]);
  });

  it("runs glossary operations against the current project database", async () => {
    const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);
    const createdEntry = await handlers.create({
      kind: "place",
      canonicalSurface: "王都アルセリア",
      description: "王国の首都"
    });

    expect(createdEntry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    const canonicalForm = canonicalFormOf(createdEntry);

    expect(canonicalForm.surface).toBe("王都アルセリア");
    await expect(
      fs.access(path.join(projectRootPath, projectDatabaseFileName))
    ).resolves.toBeUndefined();

    await expect(
      handlers.getById({
        id: createdEntry.id
      })
    ).resolves.toEqual(createdEntry);
    await expect(handlers.list()).resolves.toEqual([createdEntry]);
    await expect(
      handlers.lookupSurface({
        surface: "王都アルセリア"
      })
    ).resolves.toEqual({
      status: "unique",
      surface: "王都アルセリア",
      match: {
        entry: createdEntry,
        form: canonicalForm
      }
    });

    const updatedEntry = await handlers.update({
      id: createdEntry.id,
      kind: "concept",
      description: "改稿後の首都設定",
      canonicalSurface: "王都アルセリア",
      forms: []
    });

    expect(updatedEntry).toMatchObject({
      id: createdEntry.id,
      kind: "concept",
      description: "改稿後の首都設定"
    });
    expect(canonicalFormOf(updatedEntry).surface).toBe("王都アルセリア");

    electronMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false
    });

    await expect(
      handlers.delete({
        id: createdEntry.id,
        confirmMessage
      })
    ).resolves.toEqual({ deleted: true });
    await expect(
      handlers.getById({
        id: createdEntry.id
      })
    ).resolves.toBeNull();
    await expect(handlers.list()).resolves.toEqual([]);
  });

  it("requires an active project before accessing glossary data", async () => {
    const handlers = createGlossaryIpcHandlers(() => {
      throw new Error("No project is currently open.");
    });

    await expect(handlers.list()).rejects.toThrow(
      "No project is currently open."
    );
  });

  it("rejects invalid glossary input through the shared validation model", async () => {
    const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);

    await expect(
      handlers.create({
        kind: "term",
        canonicalSurface: " ",
        description: "invalid"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);

    await expect(
      handlers.create({
        kind: "term",
        canonicalSurface: "魔導炉",
        description: "invalid",
        matchBoundaryStart: "word"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("rejects delete requests missing a confirmation message", async () => {
    const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);

    await expect(
      handlers.delete({
        id: missingEntryId
      })
    ).rejects.toThrow();

    expect(electronMock.showMessageBox).not.toHaveBeenCalled();
  });

  it("treats deleting an already-missing entry as idempotent success", async () => {
    const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);
    electronMock.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false
    });

    await expect(
      handlers.delete({
        id: missingEntryId,
        confirmMessage
      })
    ).resolves.toEqual({ deleted: true });
  });

  describe("delete confirmation dialog", () => {
    async function seedEntry(): Promise<GlossaryEntry> {
      const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);

      return handlers.create({
        kind: "term",
        canonicalSurface: "メイド",
        description: "使用人"
      });
    }

    it("shows a warning-type confirmation dialog with Cancel as default and cancel id", async () => {
      const entry = await seedEntry();
      electronMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false
      });

      registerGlossaryIpc();
      const deleteHandler = registeredHandler(GLOSSARY_CHANNELS.delete);

      await deleteHandler({ sender: {} }, { id: entry.id, confirmMessage });

      expect(electronMock.showMessageBox).toHaveBeenCalledTimes(1);
      const options = electronMock.showMessageBox.mock.calls[0].at(-1);

      expect(options).toMatchObject({
        type: "warning",
        message: confirmMessage,
        buttons: ["OK", "Cancel"],
        defaultId: 1,
        cancelId: 1
      });
    });

    it("does not add i18n keys for the OK / Cancel button labels", async () => {
      const entry = await seedEntry();
      electronMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false
      });

      registerGlossaryIpc();
      const deleteHandler = registeredHandler(GLOSSARY_CHANNELS.delete);

      await deleteHandler({ sender: {} }, { id: entry.id, confirmMessage });

      const options = electronMock.showMessageBox.mock.calls[0].at(-1);

      expect(options.buttons).toEqual(["OK", "Cancel"]);
    });

    it("does not delete when the Cancel-equivalent button is chosen", async () => {
      const entry = await seedEntry();
      const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);
      electronMock.showMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false
      });

      await expect(
        handlers.delete({ id: entry.id, confirmMessage })
      ).resolves.toEqual({ deleted: false });
      await expect(handlers.getById({ id: entry.id })).resolves.not.toBeNull();
    });

    it("does not delete when the dialog is dismissed (undefined response)", async () => {
      const entry = await seedEntry();
      const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);
      electronMock.showMessageBox.mockResolvedValue({
        response: undefined,
        checkboxChecked: false
      });

      await expect(
        handlers.delete({ id: entry.id, confirmMessage })
      ).resolves.toEqual({ deleted: false });
      await expect(handlers.getById({ id: entry.id })).resolves.not.toBeNull();
    });

    it("deletes only when the OK-equivalent button is chosen", async () => {
      const entry = await seedEntry();
      const handlers = createGlossaryIpcHandlers(() => activeProjectFilePath);
      electronMock.showMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: false
      });

      await expect(
        handlers.delete({ id: entry.id, confirmMessage })
      ).resolves.toEqual({ deleted: true });
      await expect(handlers.getById({ id: entry.id })).resolves.toBeNull();
    });
  });
});

function canonicalFormOf(entry: GlossaryEntry): GlossaryForm {
  const canonicalForms = entry.forms.filter((form) => form.isCanonical);

  expect(canonicalForms).toHaveLength(1);

  return canonicalForms[0];
}

function registeredHandler(
  channel: string
): (...args: unknown[]) => unknown {
  const registration = electronMock.handle.mock.calls.find(
    ([registeredChannel]) => registeredChannel === channel
  );

  if (!registration) {
    throw new Error(`Handler was not registered for ${channel}.`);
  }

  return registration[1] as (...args: unknown[]) => unknown;
}
