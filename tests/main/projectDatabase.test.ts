import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentProjectDatabaseSchemaVersion,
  openProjectDatabase,
  projectDatabaseFileName,
  resolveProjectDatabasePath,
  type ProjectDatabase
} from "../../src/main/projectDatabase";

const entryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";
const otherEntryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abd";
const formId = "018f4b8c-7a2b-7c3d-8e4f-123456789abe";
const otherFormId = "018f4b8c-7a2b-7c3d-8e4f-123456789abf";
const timestamp = "2026-08-11T12:00:00.000Z";

describe("project database", () => {
  let projectRootPath: string;
  let database: ProjectDatabase | null = null;

  beforeEach(async () => {
    projectRootPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "pergamum-project-db-")
    );
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

  it("resolves pergamum.db inside the project root", () => {
    expect(resolveProjectDatabasePath(projectRootPath)).toBe(
      path.resolve(projectRootPath, projectDatabaseFileName)
    );
  });

  it("initializes a missing database with finalized schema version 1", async () => {
    database = await openProjectDatabase(projectRootPath);

    await expect(
      fs.access(path.join(projectRootPath, projectDatabaseFileName))
    ).resolves.toBeUndefined();

    const version = await database.get<{ user_version: number }>(
      "PRAGMA user_version"
    );
    const entryColumns = await database.all<{ name: string; type: string }>(
      "PRAGMA table_info(glossary_entries)"
    );
    const formColumns = await database.all<{ name: string; type: string }>(
      "PRAGMA table_info(glossary_forms)"
    );
    const indexes = await database.all<{
      name: string;
      unique: number;
      partial: number;
    }>("PRAGMA index_list(glossary_forms)");

    expect(version?.user_version).toBe(currentProjectDatabaseSchemaVersion);
    expect(entryColumns.map((column) => [column.name, column.type])).toEqual([
      ["id", "TEXT"],
      ["kind", "TEXT"],
      ["description", "TEXT"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ]);
    expect(formColumns.map((column) => [column.name, column.type])).toEqual([
      ["id", "TEXT"],
      ["entry_id", "TEXT"],
      ["surface", "TEXT"],
      ["relation", "TEXT"],
      ["warning_policy", "TEXT"],
      ["match_boundary_start", "TEXT"],
      ["match_boundary_end", "TEXT"],
      ["is_canonical", "INTEGER"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ]);
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "glossary_forms_surface_idx",
          unique: 0,
          partial: 0
        }),
        expect.objectContaining({
          name: "glossary_forms_one_canonical_per_entry_idx",
          unique: 1,
          partial: 1
        })
      ])
    );
  });

  it("logs database initialization without count or project path", async () => {
    const logger = debugLoggerMock();

    database = await openProjectDatabase(projectRootPath, logger);

    expect(dbLogEvents(logger).map((event) => event.event)).toEqual([
      "db.operation.started",
      "db.operation.succeeded"
    ]);
    expect(dbLogEvents(logger)[0]).toMatchObject({
      level: "debug",
      event: "db.operation.started",
      details: {
        dbOperationId: expect.any(String),
        dbOperation: "initialize",
        dbEntityKind: "database"
      }
    });
    expect(dbLogEvents(logger)[1]).toMatchObject({
      level: "debug",
      event: "db.operation.succeeded",
      details: {
        dbOperationId: dbLogEvents(logger)[0].details?.dbOperationId,
        dbOperation: "initialize",
        dbEntityKind: "database",
        result: "succeeded",
        durationMs: expect.any(Number)
      }
    });
    expect(dbLogEvents(logger)[1].details).not.toHaveProperty("count");
    expect(JSON.stringify(dbLogEvents(logger))).not.toContain(projectRootPath);
    expect(JSON.stringify(dbLogEvents(logger))).not.toContain(
      projectDatabaseFileName
    );
  });

  it("enables foreign keys for each opened connection", async () => {
    database = await openProjectDatabase(projectRootPath);

    const foreignKeys = await database.get<{ foreign_keys: number }>(
      "PRAGMA foreign_keys"
    );

    expect(foreignKeys?.foreign_keys).toBe(1);
  });

  it("rejects newer schema versions", async () => {
    database = await openProjectDatabase(projectRootPath);
    await database.exec("PRAGMA user_version = 999");
    await database.close();
    database = null;
    const logger = debugLoggerMock();

    await expect(
      openProjectDatabase(projectRootPath, logger)
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_SCHEMA_ERROR"
    });
    expect(dbLogEvents(logger).map((event) => event.event)).toEqual([
      "db.operation.started",
      "db.operation.failed"
    ]);
    expect(dbLogEvents(logger)[1]).toMatchObject({
      level: "error",
      event: "db.operation.failed",
      details: {
        dbOperation: "initialize",
        dbEntityKind: "database",
        result: "failed",
        durationMs: expect.any(Number),
        error: {
          name: "ProjectDatabaseError",
          code: "PROJECT_DATABASE_SCHEMA_ERROR",
          category: "database"
        }
      }
    });
    expect(JSON.stringify(dbLogEvents(logger))).not.toContain(projectRootPath);
  });

  it("rejects an incompatible prototype version 1 schema", async () => {
    const sqliteDatabase = new Database(
      path.join(projectRootPath, projectDatabaseFileName)
    );

    sqliteDatabase.exec(`
      CREATE TABLE glossary_entries (
        id INTEGER PRIMARY KEY,
        term TEXT NOT NULL CHECK (length(trim(term)) > 0),
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 1;
    `);
    sqliteDatabase.close();

    await expect(openProjectDatabase(projectRootPath)).rejects.toMatchObject({
      code: "PROJECT_DATABASE_SCHEMA_ERROR",
      message: expect.stringContaining("prototype development databases")
    });
  });

  it("rejects direct glossary rows with non-v7 or non-lowercase IDs", async () => {
    database = await openProjectDatabase(projectRootPath);

    await expect(
      insertEntry(database, "018f4b8c-7a2b-4c3d-8e4f-123456789abc")
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
    await expect(
      insertEntry(database, "018F4B8C-7A2B-7C3D-8E4F-123456789ABC")
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
  });

  it("rejects direct glossary form rows that violate canonical invariants", async () => {
    database = await openProjectDatabase(projectRootPath);
    await insertEntry(database, entryId);

    await expect(
      database.run(
        `
          INSERT INTO glossary_forms (
            id,
            entry_id,
            surface,
            relation,
            warning_policy,
            is_canonical,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, NULL, 1, ?, ?)
        `,
        [formId, entryId, "王都アルセリア", "alias", timestamp, timestamp]
      )
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });

    await expect(
      database.run(
        `
          INSERT INTO glossary_forms (
            id,
            entry_id,
            surface,
            relation,
            warning_policy,
            is_canonical,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, NULL, 0, ?, ?)
        `,
        [formId, entryId, "アルセリア", "alias", timestamp, timestamp]
      )
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
  });

  it("defaults and validates glossary form match boundary columns", async () => {
    database = await openProjectDatabase(projectRootPath);
    await insertEntry(database, entryId);
    await insertCanonicalForm(database, formId, entryId, "王都アルセリア");

    const defaultedForm = await database.get<{
      match_boundary_start: string;
      match_boundary_end: string;
    }>(
      `
        SELECT match_boundary_start, match_boundary_end
        FROM glossary_forms
        WHERE id = ?
      `,
      [formId]
    );

    expect(defaultedForm).toEqual({
      match_boundary_start: "auto",
      match_boundary_end: "auto"
    });

    await expect(
      database.run(
        `
          INSERT INTO glossary_forms (
            id,
            entry_id,
            surface,
            relation,
            warning_policy,
            match_boundary_start,
            match_boundary_end,
            is_canonical,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [
          otherFormId,
          entryId,
          "アルセリア",
          "alias",
          "default",
          "word",
          "auto",
          timestamp,
          timestamp
        ]
      )
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
  });

  it("enforces at most one canonical form per glossary entry", async () => {
    database = await openProjectDatabase(projectRootPath);
    await insertEntry(database, entryId);
    await insertCanonicalForm(database, formId, entryId, "王都アルセリア");

    await expect(
      insertCanonicalForm(database, otherFormId, entryId, "アルセリア")
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
  });

  it("cascades glossary form deletion when an entry is deleted", async () => {
    database = await openProjectDatabase(projectRootPath);
    await insertEntry(database, entryId);
    await insertCanonicalForm(database, formId, entryId, "王都アルセリア");

    await database.run("DELETE FROM glossary_entries WHERE id = ?", [entryId]);

    const row = await database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM glossary_forms WHERE entry_id = ?",
      [entryId]
    );

    expect(row?.count).toBe(0);
  });

  it("allows the same surface on different entries but rejects duplicate surfaces per entry", async () => {
    database = await openProjectDatabase(projectRootPath);
    await insertEntry(database, entryId);
    await insertEntry(database, otherEntryId);
    await insertCanonicalForm(database, formId, entryId, "帝国");
    await expect(
      insertCanonicalForm(database, otherFormId, otherEntryId, "帝国")
    ).resolves.toBeDefined();

    await expect(
      database.run(
        `
          INSERT INTO glossary_forms (
            id,
            entry_id,
            surface,
            relation,
            warning_policy,
            is_canonical,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [
          "018f4b8c-7a2b-7c3d-8e4f-123456789ac0",
          entryId,
          "帝国",
          "alias",
          "warn",
          timestamp,
          timestamp
        ]
      )
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_QUERY_ERROR"
    });
  });

  it("rolls back a failed transaction", async () => {
    database = await openProjectDatabase(projectRootPath);

    await expect(
      database.transaction(async () => {
        await insertEntry(database!, entryId);
        await database?.run(
          `
            INSERT INTO glossary_forms (
              id,
              entry_id,
              surface,
              relation,
              warning_policy,
              is_canonical,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, NULL, NULL, 1, ?, ?)
          `,
          [formId, entryId, " ", timestamp, timestamp]
        );
      })
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_TRANSACTION_ERROR"
    });

    const row = await database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM glossary_entries WHERE id = ?",
      [entryId]
    );

    expect(row?.count).toBe(0);
  });
});

async function insertEntry(
  database: ProjectDatabase,
  id: string
): Promise<void> {
  await database.run(
    `
      INSERT INTO glossary_entries (
        id,
        kind,
        description,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, "term", "説明", timestamp, timestamp]
  );
}

async function insertCanonicalForm(
  database: ProjectDatabase,
  id: string,
  entryId: string,
  surface: string
) {
  return database.run(
    `
      INSERT INTO glossary_forms (
        id,
        entry_id,
        surface,
        relation,
        warning_policy,
        is_canonical,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, 1, ?, ?)
    `,
    [id, entryId, surface, timestamp, timestamp]
  );
}

function debugLoggerMock(): { log: ReturnType<typeof vi.fn> } {
  return {
    log: vi.fn()
  };
}

function dbLogEvents(logger: { log: ReturnType<typeof vi.fn> }) {
  return logger.log.mock.calls.map((call) => call[0]);
}
