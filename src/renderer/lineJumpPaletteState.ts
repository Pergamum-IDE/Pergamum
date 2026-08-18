import type { TranslationKey } from "../shared/i18n";
import type { CommandPaletteFooterModel } from "./CommandPalette";
import { validateLineJumpQuery } from "./lineJumpQuery";

/**
 * Combines query validation with editor-context/range information into the
 * single state the Command Palette renders for `:` mode. Kept separate from
 * `lineJumpQuery.ts` (pure text parsing) since this layer knows about the
 * Palette's three-way distinction between a parser message, an out-of-range
 * message, and a disabled-by-context result row (#140).
 */
export type LineJumpPaletteState =
  | { readonly kind: "empty" }
  | { readonly kind: "fullWidthDigits" }
  | { readonly kind: "decimal" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unsafeInteger" }
  | { readonly kind: "outOfRange" }
  | { readonly kind: "executable"; readonly line: number }
  | { readonly kind: "disabled"; readonly line: number };

/**
 * `isInRange` is injected rather than computed here so this function stays
 * pure and testable: the real caller (CommandPalette.tsx) sources it from
 * `commandRegistry.isEnabledForContext`, per #128/#140 — the palette reads
 * range validity through the same command enablement path used everywhere
 * else, instead of inspecting editor/document internals itself.
 */
export function resolveLineJumpPaletteState(
  query: string,
  isEditorContext: boolean,
  isInRange: (line: number) => boolean
): LineJumpPaletteState {
  const validation = validateLineJumpQuery(query);

  if (validation.kind !== "valid") {
    return { kind: validation.kind };
  }

  if (!isEditorContext) {
    return { kind: "disabled", line: validation.line };
  }

  if (!isInRange(validation.line)) {
    return { kind: "outOfRange" };
  }

  return { kind: "executable", line: validation.line };
}

/**
 * Mirrors `resolveCommandPaletteFooterModel`'s shape for command mode:
 * disabled reuses the exact same generic message (#128/#129/#134), every
 * other state shows no status text, and only "executable" enables Enter.
 */
export function resolveLineJumpFooterModel(
  state: LineJumpPaletteState
): CommandPaletteFooterModel {
  if (state.kind === "disabled") {
    return { statusKey: "commandPalette.footer.disabled", canRunSelected: false };
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
