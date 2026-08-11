export interface GlossaryEntry {
  id: number;
  term: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlossaryEntryInput {
  term: string;
  description: string;
}

export interface UpdateGlossaryEntryInput {
  id: number;
  term: string;
  description: string;
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

function validatePositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    invalidGlossary(`${path} must be a positive integer.`);
  }

  return value;
}

function validateNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    invalidGlossary(`${path} must be a non-empty string.`);
  }

  return value;
}

function validateString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    invalidGlossary(`${path} must be a string.`);
  }

  return value;
}

function validateTimestamp(value: unknown, path: string): string {
  const timestamp = validateNonEmptyString(value, path);

  if (Number.isNaN(Date.parse(timestamp))) {
    invalidGlossary(`${path} must be a valid timestamp.`);
  }

  return timestamp;
}

export function validateGlossaryEntryId(value: unknown, path = "id"): number {
  return validatePositiveInteger(value, path);
}

export function validateGlossaryEntry(
  value: unknown,
  path = "entry"
): GlossaryEntry {
  if (!isObject(value)) {
    invalidGlossary(`${path} must be an object.`);
  }

  return {
    id: validateGlossaryEntryId(value.id, `${path}.id`),
    term: validateNonEmptyString(value.term, `${path}.term`),
    description: validateString(value.description, `${path}.description`),
    createdAt: validateTimestamp(value.createdAt, `${path}.createdAt`),
    updatedAt: validateTimestamp(value.updatedAt, `${path}.updatedAt`)
  };
}

export function validateCreateGlossaryEntryInput(
  value: unknown
): CreateGlossaryEntryInput {
  if (!isObject(value)) {
    invalidGlossary("Glossary entry input must be an object.");
  }

  return {
    term: validateNonEmptyString(value.term, "term"),
    description: validateString(value.description, "description")
  };
}

export function validateUpdateGlossaryEntryInput(
  value: unknown
): UpdateGlossaryEntryInput {
  if (!isObject(value)) {
    invalidGlossary("Glossary entry input must be an object.");
  }

  return {
    id: validateGlossaryEntryId(value.id, "id"),
    term: validateNonEmptyString(value.term, "term"),
    description: validateString(value.description, "description")
  };
}
