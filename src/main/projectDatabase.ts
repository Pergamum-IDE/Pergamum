import path from "node:path";
import Database, {
  type Database as BetterSqliteDatabase,
  type RunResult
} from "better-sqlite3";

export const projectDatabaseFileName = "pergamum.db";
export const currentProjectDatabaseSchemaVersion = 1;

export type ProjectDatabaseErrorCode =
  | "PROJECT_DATABASE_PATH_ERROR"
  | "PROJECT_DATABASE_OPEN_ERROR"
  | "PROJECT_DATABASE_SCHEMA_ERROR"
  | "PROJECT_DATABASE_MIGRATION_ERROR"
  | "PROJECT_DATABASE_QUERY_ERROR"
  | "PROJECT_DATABASE_TRANSACTION_ERROR";

export class ProjectDatabaseError extends Error {
  readonly code: ProjectDatabaseErrorCode;
  readonly cause?: unknown;

  constructor(
    code: ProjectDatabaseErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message);
    this.name = "ProjectDatabaseError";
    this.code = code;
    this.cause = cause;
  }
}

export type SqliteValue = string | number | bigint | Buffer | null;

export type SqliteParameters =
  | readonly SqliteValue[]
  | Record<string, SqliteValue>;

export interface SqliteRunResult {
  lastID: number;
  changes: number;
}

export interface ProjectDatabase {
  readonly databasePath: string;
  run(sql: string, parameters?: SqliteParameters): Promise<SqliteRunResult>;
  get<T extends Record<string, unknown>>(
    sql: string,
    parameters?: SqliteParameters
  ): Promise<T | undefined>;
  all<T extends Record<string, unknown>>(
    sql: string,
    parameters?: SqliteParameters
  ): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface Migration {
  version: number;
  migrate(database: ProjectDatabase): Promise<void>;
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function queryError(error: unknown): ProjectDatabaseError {
  return new ProjectDatabaseError(
    "PROJECT_DATABASE_QUERY_ERROR",
    `Project database query failed: ${errorDetail(error)}`,
    error
  );
}

export function resolveProjectDatabasePath(projectRootPath: string): string {
  if (projectRootPath.trim().length === 0) {
    throw new ProjectDatabaseError(
      "PROJECT_DATABASE_PATH_ERROR",
      "Project root path must be a non-empty string."
    );
  }

  const resolvedRootPath = path.resolve(projectRootPath);
  const databasePath = path.resolve(
    resolvedRootPath,
    projectDatabaseFileName
  );
  const relativeDatabasePath = path.relative(resolvedRootPath, databasePath);

  if (
    relativeDatabasePath.startsWith("..") ||
    path.isAbsolute(relativeDatabasePath)
  ) {
    throw new ProjectDatabaseError(
      "PROJECT_DATABASE_PATH_ERROR",
      "Project database path is outside the project root."
    );
  }

  return databasePath;
}

class SqliteProjectDatabase implements ProjectDatabase {
  constructor(
    readonly databasePath: string,
    private readonly database: BetterSqliteDatabase
  ) {}

  run(
    sql: string,
    parameters: SqliteParameters = []
  ): Promise<SqliteRunResult> {
    try {
      const result = runStatement(this.database, sql, parameters);
      return Promise.resolve({
        lastID: Number(result.lastInsertRowid),
        changes: result.changes
      });
    } catch (error) {
      return Promise.reject(queryError(error));
    }
  }

  get<T extends Record<string, unknown>>(
    sql: string,
    parameters: SqliteParameters = []
  ): Promise<T | undefined> {
    try {
      return Promise.resolve(getStatement<T>(this.database, sql, parameters));
    } catch (error) {
      return Promise.reject(queryError(error));
    }
  }

  all<T extends Record<string, unknown>>(
    sql: string,
    parameters: SqliteParameters = []
  ): Promise<T[]> {
    try {
      return Promise.resolve(allStatement<T>(this.database, sql, parameters));
    } catch (error) {
      return Promise.reject(queryError(error));
    }
  }

  exec(sql: string): Promise<void> {
    try {
      this.database.exec(sql);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(queryError(error));
    }
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    await this.exec("BEGIN");

    try {
      const result = await operation();
      await this.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        await this.exec("ROLLBACK");
      } catch (rollbackError) {
        throw new ProjectDatabaseError(
          "PROJECT_DATABASE_TRANSACTION_ERROR",
          `Project database transaction rollback failed: ${errorDetail(
            rollbackError
          )}`,
          rollbackError
        );
      }

      throw new ProjectDatabaseError(
        "PROJECT_DATABASE_TRANSACTION_ERROR",
        `Project database transaction failed: ${errorDetail(error)}`,
        error
      );
    }
  }

  close(): Promise<void> {
    try {
      this.database.close();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(queryError(error));
    }
  }
}

function runStatement(
  database: BetterSqliteDatabase,
  sql: string,
  parameters: SqliteParameters
): RunResult {
  const statement = database.prepare(sql);

  return Array.isArray(parameters)
    ? statement.run(...parameters)
    : statement.run(parameters);
}

function getStatement<T extends Record<string, unknown>>(
  database: BetterSqliteDatabase,
  sql: string,
  parameters: SqliteParameters
): T | undefined {
  const statement = database.prepare(sql);
  const row = Array.isArray(parameters)
    ? statement.get(...parameters)
    : statement.get(parameters);

  return row as T | undefined;
}

function allStatement<T extends Record<string, unknown>>(
  database: BetterSqliteDatabase,
  sql: string,
  parameters: SqliteParameters
): T[] {
  const statement = database.prepare(sql);
  const rows = Array.isArray(parameters)
    ? statement.all(...parameters)
    : statement.all(parameters);

  return rows as T[];
}

function openSqliteDatabase(databasePath: string): Promise<BetterSqliteDatabase> {
  try {
    return Promise.resolve(new Database(databasePath));
  } catch (error) {
    return Promise.reject(
      new ProjectDatabaseError(
        "PROJECT_DATABASE_OPEN_ERROR",
        `Could not open project database: ${errorDetail(error)}`,
        error
      )
    );
  }
}

async function readSchemaVersion(
  database: ProjectDatabase
): Promise<number> {
  const row = await database.get<{ user_version: unknown }>(
    "PRAGMA user_version"
  );

  if (!row || typeof row.user_version !== "number") {
    throw new ProjectDatabaseError(
      "PROJECT_DATABASE_SCHEMA_ERROR",
      "Could not read project database schema version."
    );
  }

  return row.user_version;
}

async function migrateToVersionOne(database: ProjectDatabase): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS glossary_entries (
      id INTEGER PRIMARY KEY,
      term TEXT NOT NULL CHECK (length(trim(term)) > 0),
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    migrate: migrateToVersionOne
  }
];

async function initializeProjectDatabase(
  database: ProjectDatabase
): Promise<void> {
  const schemaVersion = await readSchemaVersion(database);

  if (schemaVersion > currentProjectDatabaseSchemaVersion) {
    throw new ProjectDatabaseError(
      "PROJECT_DATABASE_SCHEMA_ERROR",
      `Project database schema version ${schemaVersion} is newer than supported version ${currentProjectDatabaseSchemaVersion}.`
    );
  }

  for (const migration of migrations) {
    if (migration.version <= schemaVersion) {
      continue;
    }

    try {
      await database.transaction(async () => {
        await migration.migrate(database);
        await database.exec(`PRAGMA user_version = ${migration.version}`);
      });
    } catch (error) {
      throw new ProjectDatabaseError(
        "PROJECT_DATABASE_MIGRATION_ERROR",
        `Could not migrate project database to schema version ${migration.version}: ${errorDetail(
          error
        )}`,
        error
      );
    }
  }
}

export async function openProjectDatabase(
  projectRootPath: string
): Promise<ProjectDatabase> {
  const databasePath = resolveProjectDatabasePath(projectRootPath);
  const sqliteDatabase = await openSqliteDatabase(databasePath);
  const database = new SqliteProjectDatabase(databasePath, sqliteDatabase);

  try {
    await database.exec("PRAGMA foreign_keys = ON");
    await initializeProjectDatabase(database);
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}
