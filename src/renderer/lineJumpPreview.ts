/**
 * Formats the target-line preview shown in the line jump result's secondary
 * line (#140 polish). Pure text formatting only — the caller supplies the
 * raw line content; this never reads document/editor state itself.
 *
 * `previewLength`/`ellipsis` are hard-coded via defaults for now (no
 * settings.json support, no `previewEllipsis` config in this issue) but are
 * left as parameters — not inlined constants at the call site — so a later
 * settings-backed issue can override them without reshaping this function.
 */

const DEFAULT_PREVIEW_LENGTH = 20;
const DEFAULT_PREVIEW_ELLIPSIS = "...";

export type LineJumpLinePreview =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly text: string };

export function formatLineJumpLinePreview(
  lineContent: string,
  previewLength: number = DEFAULT_PREVIEW_LENGTH,
  ellipsis: string = DEFAULT_PREVIEW_ELLIPSIS
): LineJumpLinePreview {
  // Leading whitespace is trimmed for display only; the source document is
  // never touched.
  const leadingTrimmed = lineContent.replace(/^\s+/, "");

  if (leadingTrimmed.trim().length === 0) {
    return { kind: "empty" };
  }

  if (leadingTrimmed.length <= previewLength) {
    return { kind: "text", text: leadingTrimmed };
  }

  return {
    kind: "text",
    text: leadingTrimmed.slice(0, previewLength) + ellipsis
  };
}
