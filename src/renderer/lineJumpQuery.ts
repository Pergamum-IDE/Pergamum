/**
 * Pure, locale-independent parsing for Quick Access line jump mode (#140).
 *
 * Syntax is validated with plain ASCII-digit regular expressions before any
 * numeric conversion, and the safe-integer boundary is checked with BigInt
 * rather than `Number(query)` — so a 20-digit query never round-trips
 * through floating point and never depends on the host locale's digit or
 * grouping conventions.
 */

export type LineJumpQueryValidation =
  | { readonly kind: "empty" }
  | { readonly kind: "valid"; readonly line: number }
  | { readonly kind: "fullWidthDigits" }
  | { readonly kind: "decimal" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unsafeInteger" };

const fullWidthDigitsPattern = /^[０-９]+$/;
const decimalPattern = /^\d*\.\d*$/;
// A plain digit run of any length, or strict ASCII comma thousands
// grouping (1-3 leading digits, then one or more groups of exactly 3).
const validDigitGroupingPattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;

const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);

export function validateLineJumpQuery(query: string): LineJumpQueryValidation {
  if (query.length === 0) {
    return { kind: "empty" };
  }

  if (fullWidthDigitsPattern.test(query)) {
    return { kind: "fullWidthDigits" };
  }

  if (decimalPattern.test(query)) {
    return { kind: "decimal" };
  }

  if (!validDigitGroupingPattern.test(query)) {
    return { kind: "invalid" };
  }

  const value = BigInt(query.replace(/,/g, ""));

  if (value > maxSafeInteger) {
    return { kind: "unsafeInteger" };
  }

  if (value < 1n) {
    return { kind: "invalid" };
  }

  return { kind: "valid", line: Number(value) };
}

/**
 * Converts a 1-based line number to a character offset in `content`, using
 * the same "\n"-only line model CodeMirror uses for a plain-string doc.
 * Returns null when `line` exceeds the document's line count — the caller's
 * out-of-range signal, so callers never separately re-split `content`.
 */
export function documentLineStartOffset(
  content: string,
  line: number
): number | null {
  const lines = content.split("\n");

  if (line < 1 || line > lines.length) {
    return null;
  }

  let offset = 0;

  for (let index = 0; index < line - 1; index += 1) {
    offset += lines[index].length + 1;
  }

  return offset;
}

export interface LineJumpEditorSnapshot {
  readonly lineCount: number;
  /** Returns "" for an out-of-range line rather than throwing. */
  readonly getLineText: (line: number) => string;
}

/**
 * Builds a lazily-split, per-call-cheap accessor over `content` (#148). The
 * "\n" split — the expensive part — runs at most once, on first access to
 * `lineCount` or `getLineText`, and is then reused for every further access
 * on this same snapshot. Candidate generation can call `getLineText` up to
 * `maxCandidates` times per keystroke; without this, each call would
 * re-split the whole document.
 */
export function createLineJumpEditorSnapshot(
  content: string
): LineJumpEditorSnapshot {
  let lines: readonly string[] | null = null;

  function resolveLines(): readonly string[] {
    if (lines === null) {
      lines = content.split("\n");
    }
    return lines;
  }

  return {
    get lineCount() {
      return resolveLines().length;
    },
    getLineText: (line) => resolveLines()[line - 1] ?? ""
  };
}
