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

const missingEntryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";

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
      GLOSSARY_CHANNELS.lookupSurface,
      GLOSSARY_CHANNELS.update,
      GLOSSARY_CHANNELS.delete
    ]);
  });

  it("runs glossary operations against the current project database", async () => {
    const handlers = createGlossaryIpcHandlers(() => projectRootPath);
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
      description: "改稿後の首都設定"
    });

    expect(updatedEntry).toMatchObject({
      id: createdEntry.id,
      kind: "concept",
      description: "改稿後の首都設定",
      forms: createdEntry.forms
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
        kind: "term",
        canonicalSurface: " ",
        description: "invalid"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("propagates glossary store errors", async () => {
    const handlers = createGlossaryIpcHandlers(() => projectRootPath);

    await expect(
      handlers.delete({
        id: missingEntryId
      })
    ).rejects.toBeInstanceOf(GlossaryStoreError);
  });
});

function canonicalFormOf(entry: GlossaryEntry): GlossaryForm {
  const canonicalForms = entry.forms.filter((form) => form.isCanonical);

  expect(canonicalForms).toHaveLength(1);

  return canonicalForms[0];
}
