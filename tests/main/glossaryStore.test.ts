import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGlossaryEntry,
  deleteGlossaryEntry,
  getGlossaryEntryById,
  glossaryEntryFromDatabaseRows,
  listGlossaryEntries,
  lookupGlossarySurface,
  updateGlossaryEntry,
  GlossaryStoreError
} from "../../src/main/glossaryStore";
import {
  openProjectDatabase,
  type ProjectDatabase
} from "../../src/main/projectDatabase";
import {
  GlossaryValidationError,
  type GlossaryEntry,
  type GlossaryForm
} from "../../src/shared/glossary";

const missingEntryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";
const entryRowId = "018f4b8c-7a2b-7c3d-8e4f-123456789abd";
const formRowId = "018f4b8c-7a2b-7c3d-8e4f-123456789abe";

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

  it("creates an entry and its canonical form transactionally", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "person",
      canonicalSurface: "エリシア・フォン・アルセリア",
      description: "アルセリア王国の第三皇女"
    });

    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(entry.kind).toBe("person");
    expect(entry.description).toBe("アルセリア王国の第三皇女");
    expect(entry.forms).toHaveLength(1);
    const canonicalForm = canonicalFormOf(entry);

    expect(canonicalForm).toMatchObject({
      entryId: entry.id,
      surface: "エリシア・フォン・アルセリア",
      relation: null,
      warningPolicy: null,
      matchBoundaryLeft: "auto",
      matchBoundaryRight: "auto",
      isCanonical: true
    });
    expect(Date.parse(entry.createdAt)).not.toBeNaN();
    expect(Date.parse(entry.updatedAt)).not.toBeNaN();
    expect(Date.parse(canonicalForm.createdAt)).not.toBeNaN();
    expect(Date.parse(canonicalForm.updatedAt)).not.toBeNaN();

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      entry
    );
  });

  it("creates an entry with explicit canonical match boundaries", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "person",
      canonicalSurface: "オーダ",
      description: "千年領主制度",
      matchBoundaryLeft: "strict",
      matchBoundaryRight: "none"
    });

    expect(canonicalFormOf(entry)).toMatchObject({
      surface: "オーダ",
      matchBoundaryLeft: "strict",
      matchBoundaryRight: "none"
    });
    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      entry
    );
  });

  it("lists glossary entries ordered by canonical surface", async () => {
    const secondEntry = await createGlossaryEntry(database!, {
      kind: "item",
      canonicalSurface: "魔導炉",
      description: "魔力を生成する設備"
    });
    const firstEntry = await createGlossaryEntry(database!, {
      kind: "place",
      canonicalSurface: "王都アルセリア",
      description: "王国の首都"
    });

    await expect(listGlossaryEntries(database!)).resolves.toEqual([
      firstEntry,
      secondEntry
    ]);
  });

  it("updates glossary entry fields while preserving canonical surface", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "term",
      canonicalSurface: "魔導炉",
      description: "旧式の説明",
      matchBoundaryLeft: "strict",
      matchBoundaryRight: "none"
    });
    const updatedEntry = await updateGlossaryEntry(database!, {
      id: entry.id,
      kind: "concept",
      description: "魔力を大量生成する技術",
      canonicalSurface: "魔導炉",
      forms: []
    });

    expect(updatedEntry).toMatchObject({
      id: entry.id,
      kind: "concept",
      description: "魔力を大量生成する技術",
      createdAt: entry.createdAt
    });
    expect(canonicalFormOf(updatedEntry)).toMatchObject({
      surface: "魔導炉",
      relation: null,
      warningPolicy: null,
      matchBoundaryLeft: "strict",
      matchBoundaryRight: "none",
      isCanonical: true
    });
    expect(Date.parse(updatedEntry.updatedAt)).not.toBeNaN();

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      updatedEntry
    );
  });

  it("deletes a glossary entry", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "organization",
      canonicalSurface: "帝国",
      description: "北方の大国"
    });

    await deleteGlossaryEntry(database!, entry.id);

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toBeNull();
    await expect(listGlossaryEntries(database!)).resolves.toEqual([]);
  });

  it("persists glossary entries after closing and reopening the project database", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "place",
      canonicalSurface: "王都アルセリア",
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
        id: missingEntryId,
        kind: "term",
        description: "更新できない",
        canonicalSurface: "存在しない用語",
        forms: []
      })
    ).rejects.toBeInstanceOf(GlossaryStoreError);

    await expect(
      deleteGlossaryEntry(database!, missingEntryId)
    ).rejects.toBeInstanceOf(GlossaryStoreError);
  });

  it("rejects invalid glossary input", async () => {
    await expect(
      createGlossaryEntry(database!, {
        kind: "term",
        canonicalSurface: " ",
        description: "invalid"
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);

    await expect(
      createGlossaryEntry(database!, {
        kind: "term",
        canonicalSurface: "魔導炉",
        description: "invalid",
        matchBoundaryLeft: "word" as never
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);

    const entry = await createGlossaryEntry(database!, {
      kind: "term",
      canonicalSurface: "魔導炉",
      description: "valid"
    });

    await expect(
      updateGlossaryEntry(database!, {
        id: entry.id,
        kind: "term",
        description: "invalid",
        canonicalSurface: "魔導炉",
        forms: [
          {
            surface: "魔力炉",
            relation: "alias",
            warningPolicy: "default",
            matchBoundaryLeft: "word" as never,
            matchBoundaryRight: "auto"
          }
        ]
      })
    ).rejects.toBeInstanceOf(GlossaryValidationError);
  });

  it("updates canonical, alias, variant, and warning policy forms", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "term",
      canonicalSurface: "魔導炉",
      description: "旧式の説明"
    });
    const updatedEntry = await updateGlossaryEntry(database!, {
      id: entry.id,
      kind: "concept",
      description: "魔力を大量生成する設備",
      canonicalSurface: "新型魔導炉",
      forms: [
        {
          surface: "魔力炉",
          relation: "alias",
          warningPolicy: "warn",
          matchBoundaryLeft: "strict",
          matchBoundaryRight: "none"
        },
        {
          surface: "Magic Reactor",
          relation: "variant",
          warningPolicy: "ignore",
          matchBoundaryLeft: "none",
          matchBoundaryRight: "strict"
        }
      ]
    });

    expect(canonicalFormOf(updatedEntry)).toMatchObject({
      surface: "新型魔導炉",
      relation: null,
      warningPolicy: null,
      isCanonical: true
    });
    expect(nonCanonicalFormsOf(updatedEntry)).toHaveLength(2);
    expect(nonCanonicalFormsOf(updatedEntry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "Magic Reactor",
          relation: "variant",
          warningPolicy: "ignore",
          matchBoundaryLeft: "none",
          matchBoundaryRight: "strict",
          isCanonical: false
        }),
        expect.objectContaining({
          surface: "魔力炉",
          relation: "alias",
          warningPolicy: "warn",
          matchBoundaryLeft: "strict",
          matchBoundaryRight: "none",
          isCanonical: false
        })
      ])
    );

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      updatedEntry
    );
  });

  it("rebuilds non-canonical forms without auto-aliasing the old canonical surface", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "person",
      canonicalSurface: "アルベルト",
      description: "王国の騎士"
    });
    const firstUpdate = await updateGlossaryEntry(database!, {
      id: entry.id,
      kind: "person",
      description: "王国の騎士",
      canonicalSurface: "アルベルト",
      forms: [
        {
          surface: "アル",
          relation: "alias",
          warningPolicy: "default",
          matchBoundaryLeft: "strict",
          matchBoundaryRight: "none"
        },
        {
          surface: "Albert",
          relation: "variant",
          warningPolicy: "warn",
          matchBoundaryLeft: "none",
          matchBoundaryRight: "strict"
        }
      ]
    });
    const savedAlias = nonCanonicalFormsOf(firstUpdate).find(
      (form) => form.surface === "アル"
    );

    expect(savedAlias).toBeDefined();

    const secondUpdate = await updateGlossaryEntry(database!, {
      id: entry.id,
      kind: "person",
      description: "王国の騎士",
      canonicalSurface: "アルバート",
      forms: [
        {
          id: savedAlias?.id,
          surface: "アル",
          relation: "alias",
          warningPolicy: "ignore",
          matchBoundaryLeft: savedAlias?.matchBoundaryLeft ?? "strict",
          matchBoundaryRight: savedAlias?.matchBoundaryRight ?? "none"
        }
      ]
    });

    expect(canonicalFormOf(secondUpdate).surface).toBe("アルバート");
    expect(secondUpdate.forms.map((form) => form.surface)).not.toContain(
      "アルベルト"
    );
    expect(nonCanonicalFormsOf(secondUpdate)).toEqual([
      expect.objectContaining({
        surface: "アル",
        relation: "alias",
        warningPolicy: "ignore",
        matchBoundaryLeft: "strict",
        matchBoundaryRight: "none"
      })
    ]);
    expect(canonicalFormOf(secondUpdate)).toBeTruthy();
  });

  it("rolls back entry and forms when a form insert fails inside update", async () => {
    const entry = await createGlossaryEntry(database!, {
      kind: "term",
      canonicalSurface: "魔導炉",
      description: "旧式の説明"
    });
    const duplicateFormId = "018f4b8c-7a2b-7c3d-8e4f-623456789abc";

    await expect(
      updateGlossaryEntry(database!, {
        id: entry.id,
        kind: "concept",
        description: "途中で失敗する説明",
        canonicalSurface: "新型魔導炉",
        forms: [
          {
            id: duplicateFormId,
            surface: "魔力炉",
            relation: "alias",
            warningPolicy: "default",
            matchBoundaryLeft: "auto",
            matchBoundaryRight: "auto"
          },
          {
            id: duplicateFormId,
            surface: "Magic Reactor",
            relation: "variant",
            warningPolicy: "warn",
            matchBoundaryLeft: "auto",
            matchBoundaryRight: "auto"
          }
        ]
      })
    ).rejects.toThrow();

    await expect(getGlossaryEntryById(database!, entry.id)).resolves.toEqual(
      entry
    );
  });

  it("allows exact surface lookup with none, unique, and ambiguous results", async () => {
    await expect(
      lookupGlossarySurface(database!, {
        surface: "帝国"
      })
    ).resolves.toEqual({
      status: "none",
      surface: "帝国"
    });

    const firstEntry = await createGlossaryEntry(database!, {
      kind: "organization",
      canonicalSurface: "帝国",
      description: "北方の大国"
    });

    await expect(
      lookupGlossarySurface(database!, {
        surface: "帝国"
      })
    ).resolves.toEqual({
      status: "unique",
      surface: "帝国",
      match: {
        entry: firstEntry,
        form: canonicalFormOf(firstEntry)
      }
    });

    const secondEntry = await createGlossaryEntry(database!, {
      kind: "organization",
      canonicalSurface: "帝国",
      description: "南方の大国"
    });
    const lookupResult = await lookupGlossarySurface(database!, {
      surface: "帝国"
    });

    expect(lookupResult).toEqual({
      status: "ambiguous",
      surface: "帝国",
      matches: [
        {
          entry: firstEntry,
          form: canonicalFormOf(firstEntry)
        },
        {
          entry: secondEntry,
          form: canonicalFormOf(secondEntry)
        }
      ]
    });
  });

  it("rejects invalid database rows during domain conversion", () => {
    expect(() =>
      glossaryEntryFromDatabaseRows(
        {
          id: entryRowId,
          kind: "chapter",
          description: "invalid row",
          created_at: "2026-08-11T12:00:00.000Z",
          updated_at: "2026-08-11T12:00:00.000Z"
        },
        [
          {
            id: formRowId,
            entry_id: entryRowId,
            surface: "王都アルセリア",
            relation: null,
            warning_policy: null,
            match_boundary_left: "auto",
            match_boundary_right: "auto",
            is_canonical: 1,
            created_at: "2026-08-11T12:00:00.000Z",
            updated_at: "2026-08-11T12:00:00.000Z"
          }
        ]
      )
    ).toThrow(GlossaryValidationError);
  });
});

function canonicalFormOf(entry: GlossaryEntry): GlossaryForm {
  const canonicalForms = entry.forms.filter((form) => form.isCanonical);

  expect(canonicalForms).toHaveLength(1);

  return canonicalForms[0];
}

function nonCanonicalFormsOf(entry: GlossaryEntry): GlossaryForm[] {
  return entry.forms.filter((form) => !form.isCanonical);
}
