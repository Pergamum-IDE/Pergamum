import { randomUUID } from "node:crypto";
import {
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossary,
  validateGlossaryEntry,
  validateGlossaryEntryId,
  validateUpdateGlossaryEntryInput,
  type CreateGlossaryEntryInput,
  type Glossary,
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
  name: unknown;
  category: unknown;
  description: unknown;
  notes: unknown;
}

interface GlossaryAliasRow extends Record<string, unknown> {
  entry_id: unknown;
  alias: unknown;
  position: unknown;
}

function invalidDatabaseRow(message: string): never {
  throw new GlossaryValidationError(`Invalid glossary database row: ${message}`);
}

function stringColumn(value: unknown, column: string): string {
  if (typeof value !== "string") {
    invalidDatabaseRow(`${column} must be a string.`);
  }

  return value;
}

function optionalStringColumn(
  value: unknown,
  column: string
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    invalidDatabaseRow(`${column} must be a string or null.`);
  }

  return value;
}

function integerColumn(value: unknown, column: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    invalidDatabaseRow(`${column} must be an integer.`);
  }

  return value;
}

function withOptionalEntryFields(
  entry: Pick<GlossaryEntry, "id" | "name" | "aliases">,
  row: GlossaryEntryRow
): GlossaryEntry {
  const category = optionalStringColumn(row.category, "category");
  const description = optionalStringColumn(row.description, "description");
  const notes = optionalStringColumn(row.notes, "notes");

  return validateGlossaryEntry({
    ...entry,
    ...(category === undefined ? {} : { category }),
    ...(description === undefined ? {} : { description }),
    ...(notes === undefined ? {} : { notes })
  });
}

export function glossaryEntryFromDatabaseRows(
  entryRow: GlossaryEntryRow,
  aliasRows: readonly GlossaryAliasRow[]
): GlossaryEntry {
  const id = stringColumn(entryRow.id, "id");
  const aliases = aliasRows.map((aliasRow, index) => {
    if (stringColumn(aliasRow.entry_id, "entry_id") !== id) {
      invalidDatabaseRow(`alias row ${index} belongs to a different entry.`);
    }

    integerColumn(aliasRow.position, "position");
    return stringColumn(aliasRow.alias, "alias");
  });

  return withOptionalEntryFields(
    {
      id,
      name: stringColumn(entryRow.name, "name"),
      aliases
    },
    entryRow
  );
}

function aliasesByEntryId(
  aliasRows: readonly GlossaryAliasRow[]
): Map<string, GlossaryAliasRow[]> {
  const aliases = new Map<string, GlossaryAliasRow[]>();

  for (const aliasRow of aliasRows) {
    const entryId = stringColumn(aliasRow.entry_id, "entry_id");
    const entryAliases = aliases.get(entryId) ?? [];
    entryAliases.push(aliasRow);
    aliases.set(entryId, entryAliases);
  }

  return aliases;
}

function nullableText(value: string | undefined): string | null {
  return value ?? null;
}

async function insertGlossaryEntry(
  database: ProjectDatabase,
  entry: GlossaryEntry
): Promise<void> {
  await database.run(
    `
      INSERT INTO glossary_entries (
        id,
        name,
        category,
        description,
        notes
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      entry.id,
      entry.name,
      nullableText(entry.category),
      nullableText(entry.description),
      nullableText(entry.notes)
    ]
  );

  for (const [position, alias] of entry.aliases.entries()) {
    await database.run(
      `
        INSERT INTO glossary_entry_aliases (
          entry_id,
          alias,
          position
        )
        VALUES (?, ?, ?)
      `,
      [entry.id, alias, position]
    );
  }
}

export async function loadGlossary(
  database: ProjectDatabase
): Promise<Glossary> {
  const entryRows = await database.all<GlossaryEntryRow>(`
    SELECT
      id,
      name,
      category,
      description,
      notes
    FROM glossary_entries
    ORDER BY name COLLATE NOCASE, id
  `);
  const aliasRows = await database.all<GlossaryAliasRow>(`
    SELECT
      entry_id,
      alias,
      position
    FROM glossary_entry_aliases
    ORDER BY entry_id, position
  `);
  const aliases = aliasesByEntryId(aliasRows);
  const entries = entryRows.map((entryRow) =>
    glossaryEntryFromDatabaseRows(
      entryRow,
      aliases.get(stringColumn(entryRow.id, "id")) ?? []
    )
  );

  return validateGlossary({ entries });
}

export async function saveGlossary(
  database: ProjectDatabase,
  glossary: Glossary
): Promise<Glossary> {
  const validatedGlossary = validateGlossary(glossary);

  await database.transaction(async () => {
    await database.run("DELETE FROM glossary_entries");

    for (const entry of validatedGlossary.entries) {
      await insertGlossaryEntry(database, entry);
    }
  });

  return validatedGlossary;
}

export async function createGlossaryEntry(
  database: ProjectDatabase,
  input: CreateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const validatedInput = validateCreateGlossaryEntryInput(input);
  const entry = validateGlossaryEntry({
    id: randomUUID(),
    name: validatedInput.name,
    aliases: validatedInput.aliases ?? [],
    ...(validatedInput.category === undefined
      ? {}
      : { category: validatedInput.category }),
    ...(validatedInput.description === undefined
      ? {}
      : { description: validatedInput.description }),
    ...(validatedInput.notes === undefined
      ? {}
      : { notes: validatedInput.notes })
  });

  await database.transaction(async () => {
    await insertGlossaryEntry(database, entry);
  });

  return entry;
}

export async function updateGlossaryEntry(
  database: ProjectDatabase,
  input: UpdateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const entry = validateUpdateGlossaryEntryInput(input);
  const existingEntry = await database.get<{ id: string }>(
    "SELECT id FROM glossary_entries WHERE id = ?",
    [entry.id]
  );

  if (!existingEntry) {
    throw new GlossaryStoreError(
      "GLOSSARY_ENTRY_NOT_FOUND",
      `Glossary entry not found: ${entry.id}`
    );
  }

  await database.transaction(async () => {
    await database.run(
      `
        UPDATE glossary_entries
        SET
          name = ?,
          category = ?,
          description = ?,
          notes = ?
        WHERE id = ?
      `,
      [
        entry.name,
        nullableText(entry.category),
        nullableText(entry.description),
        nullableText(entry.notes),
        entry.id
      ]
    );
    await database.run("DELETE FROM glossary_entry_aliases WHERE entry_id = ?", [
      entry.id
    ]);

    for (const [position, alias] of entry.aliases.entries()) {
      await database.run(
        `
          INSERT INTO glossary_entry_aliases (
            entry_id,
            alias,
            position
          )
          VALUES (?, ?, ?)
        `,
        [entry.id, alias, position]
      );
    }
  });

  return entry;
}

export async function deleteGlossaryEntry(
  database: ProjectDatabase,
  id: string
): Promise<void> {
  const validatedId = validateGlossaryEntryId(id);
  const result = await database.run(
    "DELETE FROM glossary_entries WHERE id = ?",
    [validatedId]
  );

  if (result.changes === 0) {
    throw new GlossaryStoreError(
      "GLOSSARY_ENTRY_NOT_FOUND",
      `Glossary entry not found: ${validatedId}`
    );
  }
}
