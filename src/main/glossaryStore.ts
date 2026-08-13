import {
  DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY,
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossaryEntry,
  validateGlossaryEntryId,
  validateGlossaryForm,
  validateGlossarySurfaceLookupInput,
  validateUpdateGlossaryEntryInput,
  type CreateGlossaryEntryInput,
  type GlossaryEntry,
  type GlossaryForm,
  type GlossarySurfaceLookupInput,
  type GlossarySurfaceLookupResult,
  type UpdateGlossaryEntryInput
} from "../shared/glossary";
import { createUuidv7 } from "./ids";
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
  kind: unknown;
  description: unknown;
  created_at: unknown;
  updated_at: unknown;
}

interface GlossaryFormRow extends Record<string, unknown> {
  id: unknown;
  entry_id: unknown;
  surface: unknown;
  relation: unknown;
  warning_policy: unknown;
  match_boundary_left: unknown;
  match_boundary_right: unknown;
  is_canonical: unknown;
  created_at: unknown;
  updated_at: unknown;
}

interface GlossarySurfaceMatchRow extends Record<string, unknown> {
  entry_id: unknown;
  entry_kind: unknown;
  entry_description: unknown;
  entry_created_at: unknown;
  entry_updated_at: unknown;
  form_id: unknown;
  form_entry_id: unknown;
  form_surface: unknown;
  form_relation: unknown;
  form_warning_policy: unknown;
  form_match_boundary_left: unknown;
  form_match_boundary_right: unknown;
  form_is_canonical: unknown;
  form_created_at: unknown;
  form_updated_at: unknown;
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

function nullableStringColumn(value: unknown, column: string): string | null {
  if (value === null) {
    return null;
  }

  return stringColumn(value, column);
}

function booleanColumn(value: unknown, column: string): boolean {
  if (value !== 0 && value !== 1) {
    invalidDatabaseRow(`${column} must be 0 or 1.`);
  }

  return value === 1;
}

function nowTimestamp(): string {
  return new Date().toISOString();
}

function notFound(id: string): GlossaryStoreError {
  return new GlossaryStoreError(
    "GLOSSARY_ENTRY_NOT_FOUND",
    `Glossary entry not found: ${id}`
  );
}

export function glossaryFormFromDatabaseRow(
  row: GlossaryFormRow
): GlossaryForm {
  return validateGlossaryForm({
    id: stringColumn(row.id, "id"),
    entryId: stringColumn(row.entry_id, "entry_id"),
    surface: stringColumn(row.surface, "surface"),
    relation: nullableStringColumn(row.relation, "relation"),
    warningPolicy: nullableStringColumn(
      row.warning_policy,
      "warning_policy"
    ),
    matchBoundaryLeft: stringColumn(
      row.match_boundary_left,
      "match_boundary_left"
    ),
    matchBoundaryRight: stringColumn(
      row.match_boundary_right,
      "match_boundary_right"
    ),
    isCanonical: booleanColumn(row.is_canonical, "is_canonical"),
    createdAt: stringColumn(row.created_at, "created_at"),
    updatedAt: stringColumn(row.updated_at, "updated_at")
  });
}

export function glossaryEntryFromDatabaseRows(
  entryRow: GlossaryEntryRow,
  formRows: GlossaryFormRow[]
): GlossaryEntry {
  const id = stringColumn(entryRow.id, "id");
  const forms = formRows.map(glossaryFormFromDatabaseRow);

  return validateGlossaryEntry({
    id,
    kind: stringColumn(entryRow.kind, "kind"),
    description: stringColumn(entryRow.description, "description"),
    forms,
    createdAt: stringColumn(entryRow.created_at, "created_at"),
    updatedAt: stringColumn(entryRow.updated_at, "updated_at")
  });
}

async function listFormsForEntry(
  database: ProjectDatabase,
  entryId: string
): Promise<GlossaryFormRow[]> {
  return database.all<GlossaryFormRow>(
    `
      SELECT
        id,
        entry_id,
        surface,
        relation,
        warning_policy,
        match_boundary_left,
        match_boundary_right,
        is_canonical,
        created_at,
        updated_at
      FROM glossary_forms
      WHERE entry_id = ?
      ORDER BY is_canonical DESC, surface COLLATE NOCASE, id
    `,
    [entryId]
  );
}

async function listFormsForEntries(
  database: ProjectDatabase,
  entryIds: string[]
): Promise<Map<string, GlossaryFormRow[]>> {
  const formsByEntryId = new Map<string, GlossaryFormRow[]>();

  for (const entryId of entryIds) {
    formsByEntryId.set(entryId, []);
  }

  if (entryIds.length === 0) {
    return formsByEntryId;
  }

  const placeholders = entryIds.map(() => "?").join(", ");
  const rows = await database.all<GlossaryFormRow>(
    `
      SELECT
        id,
        entry_id,
        surface,
        relation,
        warning_policy,
        match_boundary_left,
        match_boundary_right,
        is_canonical,
        created_at,
        updated_at
      FROM glossary_forms
      WHERE entry_id IN (${placeholders})
      ORDER BY is_canonical DESC, surface COLLATE NOCASE, id
    `,
    entryIds
  );

  for (const row of rows) {
    const entryId = stringColumn(row.entry_id, "entry_id");
    formsByEntryId.get(entryId)?.push(row);
  }

  return formsByEntryId;
}

function entryRowFromSurfaceMatchRow(
  row: GlossarySurfaceMatchRow
): GlossaryEntryRow {
  return {
    id: row.entry_id,
    kind: row.entry_kind,
    description: row.entry_description,
    created_at: row.entry_created_at,
    updated_at: row.entry_updated_at
  };
}

function formRowFromSurfaceMatchRow(
  row: GlossarySurfaceMatchRow
): GlossaryFormRow {
  return {
    id: row.form_id,
    entry_id: row.form_entry_id,
    surface: row.form_surface,
    relation: row.form_relation,
    warning_policy: row.form_warning_policy,
    match_boundary_left: row.form_match_boundary_left,
    match_boundary_right: row.form_match_boundary_right,
    is_canonical: row.form_is_canonical,
    created_at: row.form_created_at,
    updated_at: row.form_updated_at
  };
}

async function listSurfaceMatchRows(
  database: ProjectDatabase,
  surface: string
): Promise<GlossarySurfaceMatchRow[]> {
  return database.all<GlossarySurfaceMatchRow>(
    `
      SELECT
        entries.id AS entry_id,
        entries.kind AS entry_kind,
        entries.description AS entry_description,
        entries.created_at AS entry_created_at,
        entries.updated_at AS entry_updated_at,
        forms.id AS form_id,
        forms.entry_id AS form_entry_id,
        forms.surface AS form_surface,
        forms.relation AS form_relation,
        forms.warning_policy AS form_warning_policy,
        forms.match_boundary_left AS form_match_boundary_left,
        forms.match_boundary_right AS form_match_boundary_right,
        forms.is_canonical AS form_is_canonical,
        forms.created_at AS form_created_at,
        forms.updated_at AS form_updated_at
      FROM glossary_forms AS forms
      JOIN glossary_entries AS entries
        ON entries.id = forms.entry_id
      WHERE forms.surface = ?
      ORDER BY forms.entry_id, forms.id
    `,
    [surface]
  );
}

export async function createGlossaryEntry(
  database: ProjectDatabase,
  input: CreateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const validatedInput = validateCreateGlossaryEntryInput(input);
  const entryId = createUuidv7();
  const canonicalFormId = createUuidv7();
  const timestamp = nowTimestamp();

  return database.transaction(async () => {
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
      [
        entryId,
        validatedInput.kind,
        validatedInput.description,
        timestamp,
        timestamp
      ]
    );
    await database.run(
      `
        INSERT INTO glossary_forms (
          id,
          entry_id,
          surface,
          relation,
          warning_policy,
          match_boundary_left,
          match_boundary_right,
          is_canonical,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, NULL, NULL, ?, ?, 1, ?, ?)
      `,
      [
        canonicalFormId,
        entryId,
        validatedInput.canonicalSurface,
        validatedInput.matchBoundaryLeft ??
          DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY,
        validatedInput.matchBoundaryRight ??
          DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY,
        timestamp,
        timestamp
      ]
    );

    const entry = await getGlossaryEntryById(database, entryId);

    if (!entry) {
      throw notFound(entryId);
    }

    return entry;
  });
}

export async function getGlossaryEntryById(
  database: ProjectDatabase,
  id: string
): Promise<GlossaryEntry | null> {
  const validatedId = validateGlossaryEntryId(id);
  const row = await database.get<GlossaryEntryRow>(
    `
      SELECT
        id,
        kind,
        description,
        created_at,
        updated_at
      FROM glossary_entries
      WHERE id = ?
    `,
    [validatedId]
  );

  if (!row) {
    return null;
  }

  const formRows = await listFormsForEntry(database, validatedId);
  return glossaryEntryFromDatabaseRows(row, formRows);
}

export async function listGlossaryEntries(
  database: ProjectDatabase
): Promise<GlossaryEntry[]> {
  const rows = await database.all<GlossaryEntryRow>(`
    SELECT
      entries.id,
      entries.kind,
      entries.description,
      entries.created_at,
      entries.updated_at
    FROM glossary_entries AS entries
    LEFT JOIN glossary_forms AS canonical_forms
      ON canonical_forms.entry_id = entries.id
      AND canonical_forms.is_canonical = 1
    ORDER BY canonical_forms.surface COLLATE NOCASE, entries.id
  `);
  const formsByEntryId = await listFormsForEntries(
    database,
    rows.map((row) => stringColumn(row.id, "id"))
  );

  return rows.map((row) =>
    glossaryEntryFromDatabaseRows(
      row,
      formsByEntryId.get(stringColumn(row.id, "id")) ?? []
    )
  );
}

export async function updateGlossaryEntry(
  database: ProjectDatabase,
  input: UpdateGlossaryEntryInput
): Promise<GlossaryEntry> {
  const entry = validateUpdateGlossaryEntryInput(input);
  const timestamp = nowTimestamp();

  if (!(await getGlossaryEntryById(database, entry.id))) {
    throw notFound(entry.id);
  }

  return database.transaction(async () => {
    const entryResult = await database.run(
      `
        UPDATE glossary_entries
        SET
          kind = ?,
          description = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [entry.kind, entry.description, timestamp, entry.id]
    );

    if (entryResult.changes === 0) {
      throw notFound(entry.id);
    }

    await database.run(
      `
        DELETE FROM glossary_forms
        WHERE entry_id = ?
          AND is_canonical = 0
      `,
      [entry.id]
    );

    const canonicalResult = await database.run(
      `
        UPDATE glossary_forms
        SET
          surface = ?,
          updated_at = ?
        WHERE entry_id = ?
          AND is_canonical = 1
      `,
      [entry.canonicalSurface, timestamp, entry.id]
    );

    if (canonicalResult.changes !== 1) {
      throw new GlossaryValidationError(
        "Glossary entry must contain exactly one canonical form."
      );
    }

    for (const form of entry.forms) {
      await database.run(
        `
          INSERT INTO glossary_forms (
            id,
            entry_id,
            surface,
            relation,
            warning_policy,
            match_boundary_left,
            match_boundary_right,
            is_canonical,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [
          form.id ?? createUuidv7(),
          entry.id,
          form.surface,
          form.relation,
          form.warningPolicy,
          form.matchBoundaryLeft,
          form.matchBoundaryRight,
          timestamp,
          timestamp
        ]
      );
    }

    const updatedEntry = await getGlossaryEntryById(database, entry.id);

    if (!updatedEntry) {
      throw notFound(entry.id);
    }

    return updatedEntry;
  });
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
    throw notFound(validatedId);
  }
}

export async function lookupGlossarySurface(
  database: ProjectDatabase,
  input: GlossarySurfaceLookupInput
): Promise<GlossarySurfaceLookupResult> {
  const { surface } = validateGlossarySurfaceLookupInput(input);
  const matchRows = await listSurfaceMatchRows(database, surface);

  if (matchRows.length === 0) {
    return {
      status: "none",
      surface
    };
  }

  const entryIds = Array.from(
    new Set(matchRows.map((row) => stringColumn(row.entry_id, "entry_id")))
  );
  const formsByEntryId = await listFormsForEntries(database, entryIds);
  const matches = matchRows.map((row) => {
    const entryId = stringColumn(row.entry_id, "entry_id");

    return {
      entry: glossaryEntryFromDatabaseRows(
        entryRowFromSurfaceMatchRow(row),
        formsByEntryId.get(entryId) ?? []
      ),
      form: glossaryFormFromDatabaseRow(formRowFromSurfaceMatchRow(row))
    };
  });

  if (matches.length === 1) {
    return {
      status: "unique",
      surface,
      match: matches[0]
    };
  }

  return {
    status: "ambiguous",
    surface,
    matches
  };
}
