import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  currentProjectDatabaseSchemaVersion,
  openProjectDatabase,
  projectDatabaseFileName,
  resolveProjectDatabasePath,
  type ProjectDatabase
} from "../../src/main/projectDatabase";

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

  it("initializes a missing database with schema version and glossary schema", async () => {
    database = await openProjectDatabase(projectRootPath);

    await expect(
      fs.access(path.join(projectRootPath, projectDatabaseFileName))
    ).resolves.toBeUndefined();

    const version = await database.get<{ user_version: number }>(
      "PRAGMA user_version"
    );
    const table = await database.get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      ["glossary_entries"]
    );

    expect(version?.user_version).toBe(currentProjectDatabaseSchemaVersion);
    expect(table?.name).toBe("glossary_entries");
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

    await expect(openProjectDatabase(projectRootPath)).rejects.toMatchObject({
      code: "PROJECT_DATABASE_SCHEMA_ERROR"
    });
  });

  it("rolls back a failed transaction", async () => {
    database = await openProjectDatabase(projectRootPath);

    await expect(
      database.transaction(async () => {
        await database?.run(
          "INSERT INTO glossary_entries (id, name) VALUES (?, ?)",
          ["rollback-entry", "Rollback Entry"]
        );
        await database?.run(
          "INSERT INTO glossary_entries (id, name) VALUES (?, ?)",
          ["rollback-entry", "Duplicate Entry"]
        );
      })
    ).rejects.toMatchObject({
      code: "PROJECT_DATABASE_TRANSACTION_ERROR"
    });

    const row = await database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM glossary_entries WHERE id = ?",
      ["rollback-entry"]
    );

    expect(row?.count).toBe(0);
  });
});
