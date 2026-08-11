import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGlossaryEntry,
  deleteGlossaryEntry,
  glossaryEntryFromDatabaseRows,
  loadGlossary,
  saveGlossary,
  updateGlossaryEntry
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

  it("loads an empty glossary from a new project database", async () => {
    await expect(loadGlossary(database!)).resolves.toEqual({
      entries: []
    });
  });

  it("creates and loads a glossary entry", async () => {
    const entry = await createGlossaryEntry(database!, {
      name: "エリシア・フォン・アルセリア",
      aliases: ["エリシア", "第三皇女"],
      category: "Character",
      description: "アルセリア王国の第三皇女",
      notes: "一人称では名乗らない"
    });
    const glossary = await loadGlossary(database!);

    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(glossary.entries).toEqual([entry]);
  });

  it("updates a glossary entry", async () => {
    const entry = await createGlossaryEntry(database!, {
      name: "魔導炉",
      aliases: ["炉"]
    });
    const updated = await updateGlossaryEntry(database!, {
      id: entry.id,
      name: "大型魔導炉",
      aliases: ["魔導炉", "炉心"],
      category: "Technology"
    });

    await expect(loadGlossary(database!)).resolves.toEqual({
      entries: [updated]
    });
  });

  it("deletes aliases through ON DELETE CASCADE", async () => {
    const entry = await createGlossaryEntry(database!, {
      name: "王都アルセリア",
      aliases: ["王都", "アルセリア"]
    });

    await deleteGlossaryEntry(database!, entry.id);

    const aliasCount = await database!.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM glossary_entry_aliases WHERE entry_id = ?",
      [entry.id]
    );

    expect(aliasCount?.count).toBe(0);
    await expect(loadGlossary(database!)).resolves.toEqual({
      entries: []
    });
  });

  it("saves a whole glossary", async () => {
    await saveGlossary(database!, {
      entries: [
        {
          id: "entry-1",
          name: "帝国",
          aliases: ["北方帝国"],
          category: "Organization"
        },
        {
          id: "entry-2",
          name: "魔導炉",
          aliases: []
        }
      ]
    });

    await expect(loadGlossary(database!)).resolves.toEqual({
      entries: [
        {
          id: "entry-1",
          name: "帝国",
          aliases: ["北方帝国"],
          category: "Organization"
        },
        {
          id: "entry-2",
          name: "魔導炉",
          aliases: []
        }
      ]
    });
  });

  it("rejects invalid glossary input", async () => {
    await expect(
      createGlossaryEntry(database!, {
        name: " ",
        aliases: []
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);

    await expect(
      saveGlossary(database!, {
        entries: [
          {
            id: "duplicate",
            name: "帝国",
            aliases: []
          },
          {
            id: "duplicate",
            name: "皇国",
            aliases: []
          }
        ]
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("rejects invalid database rows during domain conversion", () => {
    expect(() =>
      glossaryEntryFromDatabaseRows(
        {
          id: "entry-1",
          name: 42,
          category: null,
          description: null,
          notes: null
        },
        []
      )
    ).toThrow(GlossaryValidationError);
  });
});
