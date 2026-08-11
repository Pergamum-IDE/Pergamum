import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLOSSARY_CHANNELS } from "../../src/shared/api";
import { GlossaryValidationError } from "../../src/shared/glossary";
import { GlossaryStoreError } from "../../src/main/glossaryStore";
import { projectDatabaseFileName } from "../../src/main/projectDatabase";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn()
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: electronMock.handle
  }
}));

import {
  createGlossaryIpcHandlers,
  registerGlossaryIpc
} from "../../src/main/glossaryIpc";

describe("glossary IPC", () => {
  let projectRootPath: string;

  beforeEach(async () => {
    electronMock.handle.mockClear();
    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-glossary-ipc-")
    );
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
      GLOSSARY_CHANNELS.update,
      GLOSSARY_CHANNELS.delete
    ]);
  });

  it("runs glossary CRUD operations against the current project database", async () => {
    const handlers = createGlossaryIpcHandlers(() => projectRootPath);
    const createdEntry = await handlers.create({
      term: "王都アルセリア",
      description: "王国の首都"
    });

    expect(createdEntry.id).toBeGreaterThan(0);
    expect(createdEntry.term).toBe("王都アルセリア");
    await expect(
      fs.access(path.join(projectRootPath, projectDatabaseFileName))
    ).resolves.toBeUndefined();

    await expect(
      handlers.getById({
        id: createdEntry.id
      })
    ).resolves.toEqual(createdEntry);
    await expect(handlers.list()).resolves.toEqual([createdEntry]);

    const updatedEntry = await handlers.update({
      id: createdEntry.id,
      term: "アルセリア王都",
      description: "改稿後の首都設定"
    });

    expect(updatedEntry).toMatchObject({
      id: createdEntry.id,
      term: "アルセリア王都",
      description: "改稿後の首都設定"
    });

    await handlers.delete({
      id: createdEntry.id
    });
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
    const handlers = createGlossaryIpcHandlers(() => projectRootPath);

    await expect(
      handlers.create({
        term: " ",
        description: "invalid"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("propagates glossary store errors", async () => {
    const handlers = createGlossaryIpcHandlers(() => projectRootPath);

    await expect(
      handlers.delete({
        id: 999
      })
    ).rejects.toBeInstanceOf(GlossaryStoreError);
  });
});
