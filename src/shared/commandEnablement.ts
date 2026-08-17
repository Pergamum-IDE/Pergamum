/**
 * Declarative command enablement policy (#128).
 *
 * `when` expresses command enablement as a small JSON-compatible AST rather
 * than an arbitrary predicate function, so the host can validate it at
 * registration time and evaluate it cheaply/safely on every Command Palette
 * keystroke or execution attempt, including for future plugin-owned commands.
 */

export type CommandContextKey =
  | "project.isOpen"
  | "editor.hasDocument"
  | "editor.isDirty"
  | "editor.kind.markdown"
  | "editor.kind.glossary"
  | "glossary.occurrences.tracking.active";

export const commandContextKeys: readonly CommandContextKey[] = [
  "project.isOpen",
  "editor.hasDocument",
  "editor.isDirty",
  "editor.kind.markdown",
  "editor.kind.glossary",
  "glossary.occurrences.tracking.active"
] as const;

export function isCommandContextKey(
  value: unknown
): value is CommandContextKey {
  return (
    typeof value === "string" &&
    (commandContextKeys as readonly string[]).includes(value)
  );
}

export interface CommandEnablementKeyExpression {
  readonly key: CommandContextKey;
}

export interface CommandEnablementNotExpression {
  readonly not: CommandEnablementExpression;
}

export interface CommandEnablementAllOfExpression {
  readonly allOf: readonly CommandEnablementExpression[];
}

export interface CommandEnablementAnyOfExpression {
  readonly anyOf: readonly CommandEnablementExpression[];
}

export type CommandEnablementExpression =
  | CommandEnablementKeyExpression
  | CommandEnablementNotExpression
  | CommandEnablementAllOfExpression
  | CommandEnablementAnyOfExpression;

/**
 * A copied, value-only snapshot of context key booleans. Known keys that are
 * absent evaluate as false (legitimate missing state); values outside this
 * set are not representable, so unknown-key failures can only come from
 * {@link validateCommandEnablementExpression} at registration time.
 */
export type CommandContext = Partial<Record<CommandContextKey, boolean>>;

export class InvalidCommandEnablementExpressionError extends Error {
  constructor(message: string) {
    super(`Invalid command enablement expression: ${message}`);
    this.name = "InvalidCommandEnablementExpressionError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural validation for registration time. Rejects unknown expression
 * shapes/operators, invalid or out-of-catalog keys, and empty `allOf`/`anyOf`
 * groups (mathematically valid as true/false respectively, but far more
 * likely to be an implementation mistake than an intentional edge case).
 */
export function validateCommandEnablementExpression(
  expression: CommandEnablementExpression
): void {
  if (!isPlainObject(expression)) {
    throw new InvalidCommandEnablementExpressionError(
      "expected an expression object"
    );
  }

  const shapeKeys = Object.keys(expression);

  if (shapeKeys.length !== 1) {
    throw new InvalidCommandEnablementExpressionError(
      "expected exactly one of key, not, allOf, or anyOf"
    );
  }

  const [shape] = shapeKeys;

  switch (shape) {
    case "key": {
      const value = (expression as CommandEnablementKeyExpression).key;

      if (!isCommandContextKey(value)) {
        throw new InvalidCommandEnablementExpressionError(
          `unknown context key: ${JSON.stringify(value)}`
        );
      }
      return;
    }
    case "not": {
      validateCommandEnablementExpression(
        (expression as CommandEnablementNotExpression).not
      );
      return;
    }
    case "allOf":
    case "anyOf": {
      const children = (expression as Record<string, unknown>)[shape];

      if (!Array.isArray(children) || children.length === 0) {
        throw new InvalidCommandEnablementExpressionError(
          `${shape} must be a non-empty array`
        );
      }

      for (const child of children) {
        validateCommandEnablementExpression(
          child as CommandEnablementExpression
        );
      }
      return;
    }
    default:
      throw new InvalidCommandEnablementExpressionError(
        `unknown operator: ${shape}`
      );
  }
}

/**
 * Omitted `when` means enabled. A known key absent from `context` evaluates
 * as false (legitimate missing state, distinct from a registration bug).
 */
export function evaluateCommandEnablement(
  expression: CommandEnablementExpression | undefined,
  context: CommandContext
): boolean {
  if (!expression) {
    return true;
  }

  if ("key" in expression) {
    return context[expression.key] === true;
  }

  if ("not" in expression) {
    return !evaluateCommandEnablement(expression.not, context);
  }

  if ("allOf" in expression) {
    return expression.allOf.every((child) =>
      evaluateCommandEnablement(child, context)
    );
  }

  return expression.anyOf.some((child) =>
    evaluateCommandEnablement(child, context)
  );
}
