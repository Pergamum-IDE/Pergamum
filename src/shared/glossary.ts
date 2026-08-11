export interface GlossaryEntry {
  id: string;
  name: string;
  aliases: string[];
  category?: string;
  description?: string;
  notes?: string;
}

export interface Glossary {
  entries: GlossaryEntry[];
}

export interface CreateGlossaryEntryInput {
  name: string;
  aliases?: string[];
  category?: string;
  description?: string;
  notes?: string;
}

export interface UpdateGlossaryEntryInput {
  id: string;
  name: string;
  aliases: string[];
  category?: string;
  description?: string;
  notes?: string;
}

export class GlossaryValidationError extends Error {
  readonly code = "GLOSSARY_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "GlossaryValidationError";
  }
}

function invalidGlossary(message: string): never {
  throw new GlossaryValidationError(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    invalidGlossary(`${path} must be a non-empty string.`);
  }

  return value;
}

function optionalString(
  value: Record<string, unknown>,
  key: "category" | "description" | "notes",
  path: string
): string | undefined {
  if (!(key in value) || value[key] === undefined) {
    return undefined;
  }

  if (typeof value[key] !== "string") {
    invalidGlossary(`${path}.${key} must be a string.`);
  }

  return value[key];
}

function validateAliases(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    invalidGlossary(`${path} must be a string array.`);
  }

  const aliases: string[] = [];
  const seenAliases = new Set<string>();

  value.forEach((alias, index) => {
    const aliasPath = `${path}[${index}]`;
    const validatedAlias = validateNonEmptyString(alias, aliasPath);
    const normalizedAlias = validatedAlias.trim();

    if (seenAliases.has(normalizedAlias)) {
      invalidGlossary(`${path} must not contain duplicate aliases.`);
    }

    seenAliases.add(normalizedAlias);
    aliases.push(validatedAlias);
  });

  return aliases;
}

function withOptionalGlossaryEntryFields<T extends GlossaryEntry | CreateGlossaryEntryInput>(
  entry: T,
  value: Record<string, unknown>,
  path: string
): T {
  const category = optionalString(value, "category", path);
  const description = optionalString(value, "description", path);
  const notes = optionalString(value, "notes", path);

  return {
    ...entry,
    ...(category === undefined ? {} : { category }),
    ...(description === undefined ? {} : { description }),
    ...(notes === undefined ? {} : { notes })
  };
}

export function validateGlossaryEntryId(
  value: unknown,
  path = "id"
): string {
  return validateNonEmptyString(value, path);
}

export function validateGlossaryEntry(
  value: unknown,
  path = "entry"
): GlossaryEntry {
  if (!isObject(value)) {
    invalidGlossary(`${path} must be an object.`);
  }

  const entry: GlossaryEntry = {
    id: validateGlossaryEntryId(value.id, `${path}.id`),
    name: validateNonEmptyString(value.name, `${path}.name`),
    aliases: validateAliases(value.aliases, `${path}.aliases`)
  };

  return withOptionalGlossaryEntryFields(entry, value, path);
}

export function validateCreateGlossaryEntryInput(
  value: unknown
): CreateGlossaryEntryInput {
  if (!isObject(value)) {
    invalidGlossary("Glossary entry input must be an object.");
  }

  const input: CreateGlossaryEntryInput = {
    name: validateNonEmptyString(value.name, "name"),
    ...("aliases" in value
      ? { aliases: validateAliases(value.aliases, "aliases") }
      : {})
  };

  return withOptionalGlossaryEntryFields(input, value, "entry");
}

export function validateUpdateGlossaryEntryInput(
  value: unknown
): UpdateGlossaryEntryInput {
  const entry = validateGlossaryEntry(value);

  return {
    id: entry.id,
    name: entry.name,
    aliases: entry.aliases,
    ...(entry.category === undefined ? {} : { category: entry.category }),
    ...(entry.description === undefined
      ? {}
      : { description: entry.description }),
    ...(entry.notes === undefined ? {} : { notes: entry.notes })
  };
}

export function validateGlossary(value: unknown): Glossary {
  if (!isObject(value)) {
    invalidGlossary("Glossary must be an object.");
  }

  if (!Array.isArray(value.entries)) {
    invalidGlossary("Glossary entries must be an array.");
  }

  const seenIds = new Set<string>();
  const entries = value.entries.map((entry, index) =>
    validateGlossaryEntry(entry, `entries[${index}]`)
  );

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      invalidGlossary("Glossary entry IDs must be unique.");
    }

    seenIds.add(entry.id);
  }

  return { entries };
}
