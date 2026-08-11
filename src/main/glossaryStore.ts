import {
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossaryEntry,
  validateGlossaryEntryId,
  validateUpdateGlossaryEntryInput,
  type CreateGlossaryEntryInput,
  type GlossaryEntry,
  type UpdateGlossaryEntryInput
} from "../shared/glossary";
import type { ProjectDatabase } from "./projectDatabase";

export type GlossaryStoreErrorCode = "GLOSSARY_ENTRY_NOT_FOUND";

export class GlossaryStoreError extends Error {
  readonly code: GlossaryStoreErrorCode;

  constructor(code: GlossaryStoreErrorCode, message: string) {
    super(message);
    this.name = "GlossaryStoreError";
    this.code = code;
  }
}

interface GlossaryEntryRow extends Record<string, unknown> {
  id: unknown;
  term: unknown;
  description: unknown;
  created_at: unknown;
  updated_at: unknown;
}

function invalidDatabaseRow(message: string): never {
  throw new GlossaryValidationError(`Invalid glossary database row: ${message}`);
}

function integerColumn(value: unknown, column: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    invalidDatabaseRow(`${column} must be an integer.`);
  }

  return value;
}

function stringColumn(value: unknown, column: string): string {
  if (typeof value !== "string") {
    invalidDatabaseRow(`${column} must be a string.`);
  }

  return value;
}

function nowTimestamp(): string {
  return new Date().toISOString();
}

export function glossaryEntryFromDatabaseRow(
  row: GlossaryEntryRow
): GlossaryEntry {
  return validateGlossaryEntry({
    id: integerColumn(row.id, "id"),
    term: stringColumn(row.term, "term"),
    description: stringColumn(row.description, "description"),
    createdAt: stringColumn(row.created_at, "created_at"),
    updatedAt: stringColumn(row.updated_at, "updated_at")
  });
}

function notFound(id: number): GlossaryStoreError {
  return new GlossaryStoreError(
    "GLOSSARY_ENTRY_NOT_FOUND",
    `Glossary entry not found: ${id}`
  );
}

export async function createGlossaryEntry(
  database: ProjectDatabase,
  input: CreateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const validatedInput = validateCreateGlossaryEntryInput(input);
  const timestamp = nowTimestamp();
  const result = await database.run(
    `
      INSERT INTO glossary_entries (
        term,
        description,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      validatedInput.term,
      validatedInput.description,
      timestamp,
      timestamp
    ]
  );

  const entry = await getGlossaryEntryById(database, result.lastID);

  if (!entry) {
    throw notFound(result.lastID);
  }

  return entry;
}

export async function getGlossaryEntryById(
  database: ProjectDatabase,
  id: number
): Promise<GlossaryEntry | null> {
  const validatedId = validateGlossaryEntryId(id);
  const row = await database.get<GlossaryEntryRow>(
    `
      SELECT
        id,
        term,
        description,
        created_at,
        updated_at
      FROM glossary_entries
      WHERE id = ?
    `,
    [validatedId]
  );

  return row ? glossaryEntryFromDatabaseRow(row) : null;
}

export async function listGlossaryEntries(
  database: ProjectDatabase
): Promise<GlossaryEntry[]> {
  const rows = await database.all<GlossaryEntryRow>(`
    SELECT
      id,
      term,
      description,
      created_at,
      updated_at
    FROM glossary_entries
    ORDER BY term COLLATE NOCASE, id
  `);

  return rows.map(glossaryEntryFromDatabaseRow);
}

export async function updateGlossaryEntry(
  database: ProjectDatabase,
  input: UpdateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const entry = validateUpdateGlossaryEntryInput(input);
  const timestamp = nowTimestamp();
  const result = await database.run(
    `
      UPDATE glossary_entries
      SET
        term = ?,
        description = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [entry.term, entry.description, timestamp, entry.id]
  );

  if (result.changes === 0) {
    throw notFound(entry.id);
  }

  const updatedEntry = await getGlossaryEntryById(database, entry.id);

  if (!updatedEntry) {
    throw notFound(entry.id);
  }

  return updatedEntry;
}

export async function deleteGlossaryEntry(
  database: ProjectDatabase,
  id: number
): Promise<void> {
  const validatedId = validateGlossaryEntryId(id);
  const result = await database.run(
    "DELETE FROM glossary_entries WHERE id = ?",
    [validatedId]
  );

  if (result.changes === 0) {
    throw notFound(validatedId);
  }
}
