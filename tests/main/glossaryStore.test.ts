import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGlossaryEntry,
  deleteGlossaryEntry,
  getGlossaryEntryById,
  glossaryEntryFromDatabaseRow,
  listGlossaryEntries,
  updateGlossaryEntry,
  GlossaryStoreError
} from "../../src/main/glossaryStore";
import {
  openProjectDatabase,
  type ProjectDatabase
} from "../../src/main/projectDatabase";
import { GlossaryValidationError } from "../../src/shared/glossary";

describe("glossary store", () => {
  let projectRootPath: string;
  let database: ProjectDatabase | null = null;

  beforeEach(async () => {
    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-glossary-")
    );
    database = await openProjectDatabase(projectRootPath);
  });

  afterEach(async () => {
    if (database) {
      await database.close();
      database = null;
    }

    await fs.rm(projectRootPath, {
      recursive: true,
      force: true
    });
  });

  it("lists an empty glossary from a new project database", async () => {
    await expect(listGlossaryEntries(database!)).resolves.toEqual([]);
  });

  it("creates and gets a glossary entry by ID", async () => {
    const entry = await createGlossaryEntry(database!, {
      term: "エリシア・フォン・アルセリア",
      description: "アルセリア王国の第三皇女"
    });

    expect(entry.id).toBeGreaterThan(0);
    expect(entry.term).toBe("エリシア・フォン・アルセリア");
    expect(entry.description).toBe("アルセリア王国の第三皇女");
    expect(Date.parse(entry.createdAt)).not.toBeNaN();
    expect(Date.parse(entry.updatedAt)).not.toBeNaN();

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      entry
    );
  });

  it("lists glossary entries ordered by term", async () => {
    const secondEntry = await createGlossaryEntry(database!, {
      term: "魔導炉",
      description: "魔力を生成する設備"
    });
    const firstEntry = await createGlossaryEntry(database!, {
      term: "王都アルセリア",
      description: "王国の首都"
    });

    await expect(listGlossaryEntries(database!)).resolves.toEqual([
      firstEntry,
      secondEntry
    ]);
  });

  it("updates a glossary entry", async () => {
    const entry = await createGlossaryEntry(database!, {
      term: "魔導炉",
      description: "旧式の説明"
    });
    const updatedEntry = await updateGlossaryEntry(database!, {
      id: entry.id,
      term: "大型魔導炉",
      description: "魔力を大量生成する設備"
    });

    expect(updatedEntry).toMatchObject({
      id: entry.id,
      term: "大型魔導炉",
      description: "魔力を大量生成する設備",
      createdAt: entry.createdAt
    });
    expect(Date.parse(updatedEntry.updatedAt)).not.toBeNaN();

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      updatedEntry
    );
  });

  it("deletes a glossary entry", async () => {
    const entry = await createGlossaryEntry(database!, {
      term: "帝国",
      description: "北方の大国"
    });

    await deleteGlossaryEntry(database!, entry.id);

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toBeNull();
    await expect(listGlossaryEntries(database!)).resolves.toEqual([]);
  });

  it("persists glossary entries after closing and reopening the project database", async () => {
    const entry = await createGlossaryEntry(database!, {
      term: "王都アルセリア",
      description: "王国の首都"
    });

    await database!.close();
    database = await openProjectDatabase(projectRootPath);

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      entry
    );
  });

  it("rejects missing entries on update and delete", async () => {
    await expect(
      updateGlossaryEntry(database!, {
        id: 999,
        term: "存在しない項目",
        description: "更新できない"
      })
    ).rejects.toBeInstanceOf(GlossaryStoreError);

    await expect(deleteGlossaryEntry(database!, 999)).rejects.toBeInstanceOf(
      GlossaryStoreError
    );
  });

  it("rejects invalid glossary input", async () => {
    await expect(
      createGlossaryEntry(database!, {
        term: " ",
        description: "invalid"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("rejects invalid database rows during domain conversion", () => {
    expect(() =>
      glossaryEntryFromDatabaseRow({
        id: 1,
        term: 42,
        description: "invalid row",
        created_at: "2026-08-11T12:00:00.000Z",
        updated_at: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);
  });
});
