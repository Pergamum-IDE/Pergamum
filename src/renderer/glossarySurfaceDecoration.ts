import type {
  GlossarySurfaceIndex,
  GlossarySurfaceTextMatch
} from "../shared/glossarySurfaceMatching";
import { matchGlossarySurfacesInText } from "../shared/glossarySurfaceMatching";

export type GlossarySurfaceDecorationSegment =
  | { kind: "plain"; text: string }
  | { kind: "match"; match: GlossarySurfaceTextMatch };

export interface GlossarySurfaceDecorationAncestor {
  readonly tagName: string;
  readonly parentElement: GlossarySurfaceDecorationAncestor | null;
}

const skippedDecorationAncestorTagNames = new Set(["A", "CODE", "PRE"]);

export function isGlossarySurfaceDecorationSkipTagName(
  tagName: string
): boolean {
  return skippedDecorationAncestorTagNames.has(tagName.toUpperCase());
}

export function shouldSkipGlossarySurfaceDecorationTextNode(
  parentElement: GlossarySurfaceDecorationAncestor | null
): boolean {
  let element = parentElement;

  while (element) {
    if (isGlossarySurfaceDecorationSkipTagName(element.tagName)) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
}

export function buildGlossarySurfaceDecorationSegments(
  text: string,
  index: GlossarySurfaceIndex
): GlossarySurfaceDecorationSegment[] {
  const matches = matchGlossarySurfacesInText(text, index);

  if (matches.length === 0) {
    return text.length > 0 ? [{ kind: "plain", text }] : [];
  }

  const segments: GlossarySurfaceDecorationSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.range.start > cursor) {
      segments.push({
        kind: "plain",
        text: text.slice(cursor, match.range.start)
      });
    }

    segments.push({ kind: "match", match });
    cursor = match.range.end;
  }

  if (cursor < text.length) {
    segments.push({
      kind: "plain",
      text: text.slice(cursor)
    });
  }

  return segments;
}
