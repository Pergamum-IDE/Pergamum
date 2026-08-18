import type { TranslationKey } from "../shared/i18n";
import type { CommandPaletteFooterModel } from "./CommandPalette";
import {
  resolveLineJumpCandidates,
  type LineJumpCandidate
} from "./lineJumpCandidates";
import {
  validateLineJumpQuery,
  type LineJumpEditorSnapshot
} from "./lineJumpQuery";

/**
 * Combines query validation with editor-context/candidate information into
 * the single state the Command Palette renders for `:` mode. Kept separate
 * from `lineJumpQuery.ts` (pure text parsing) since this layer knows about
 * the Palette's distinction between a parser message, an out-of-range
 * message, a disabled-by-context result row, and an executable candidate
 * list (#140, expanded to prefix candidates in #148).
 */
export type LineJumpPaletteState =
  | { readonly kind: "empty" }
  | { readonly kind: "fullWidthDigits" }
  | { readonly kind: "decimal" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unsafeInteger" }
  | { readonly kind: "outOfRange" }
  | {
      readonly kind: "executable";
      readonly candidates: readonly LineJumpCandidate[];
      /** Matching candidates beyond the displayed list (#148 follow-up). */
      readonly remainingCount: number;
    }
  | { readonly kind: "disabled"; readonly line: number };

/**
 * `editorSnapshot` is injected (null when there is no active
 * line-addressable editor) rather than read here so this function stays
 * pure and testable: the real caller (CommandPalette.tsx) sources it from a
 * prop supplied by App.tsx, per #128/#140/#148 — the palette never inspects
 * editor/document internals itself.
 *
 * A valid query with zero candidates is, by construction, out of range: the
 * exact match is always the numerically smallest possible candidate (see
 * `resolveLineJumpCandidates`), so if it doesn't fit within the document's
 * line count, nothing else can either. This is why #148 does not need a
 * separate "no matching lines" message — out-of-range already covers it.
 */
export function resolveLineJumpPaletteState(
  query: string,
  editorSnapshot: LineJumpEditorSnapshot | null,
  maxCandidates?: number
): LineJumpPaletteState {
  const validation = validateLineJumpQuery(query);

  if (validation.kind !== "valid") {
    return { kind: validation.kind };
  }

  if (!editorSnapshot) {
    return { kind: "disabled", line: validation.line };
  }

  const { candidates, totalMatchCount } = resolveLineJumpCandidates({
    prefixQuery: String(validation.line),
    lineCount: editorSnapshot.lineCount,
    maxCandidates,
    getLineText: editorSnapshot.getLineText
  });

  if (candidates.length === 0) {
    return { kind: "outOfRange" };
  }

  return {
    kind: "executable",
    candidates,
    remainingCount: totalMatchCount - candidates.length
  };
}

/**
 * Mirrors `resolveCommandPaletteFooterModel`'s shape for command mode:
 * disabled reuses the exact same generic message (#128/#129/#134), an
 * executable list with more matches than displayed shows the remaining
 * count (#148 follow-up), every other state shows no status text, and only
 * "executable" enables Enter.
 */
export function resolveLineJumpFooterModel(
  state: LineJumpPaletteState
): CommandPaletteFooterModel {
  if (state.kind === "disabled") {
    return { statusKey: "commandPalette.footer.disabled", canRunSelected: false };
  }

  if (state.kind === "executable" && state.remainingCount > 0) {
    return {
      statusKey: "commandPalette.lineJump.moreCandidates",
      statusValues: { count: state.remainingCount },
      canRunSelected: true
    };
  }

  return { statusKey: null, canRunSelected: state.kind === "executable" };
}

const messageKeyByState: Partial<Record<LineJumpPaletteState["kind"], TranslationKey>> =
  {
    empty: "commandPalette.lineJump.empty",
    fullWidthDigits: "commandPalette.lineJump.fullWidthDigits",
    decimal: "commandPalette.lineJump.decimal",
    invalid: "commandPalette.lineJump.invalid",
    unsafeInteger: "commandPalette.lineJump.invalid",
    outOfRange: "commandPalette.lineJump.outOfRange"
  };

/**
 * The message shown in place of a result row. Null for "executable" and
 * "disabled" — those render an actual (possibly disabled) result row
 * instead, per #140's distinction between a parser message and a command
 * result.
 */
export function lineJumpMessageKey(
  state: LineJumpPaletteState
): TranslationKey | null {
  return messageKeyByState[state.kind] ?? null;
}
