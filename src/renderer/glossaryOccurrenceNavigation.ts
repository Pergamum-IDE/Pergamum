import { editorIdEquals, type EditorId } from "../shared/editorId";
import type { GlossaryEntry, GlossaryEntryId } from "../shared/glossary";
import {
  buildGlossarySurfaceIndex,
  matchGlossarySurfacesInText
} from "../shared/glossarySurfaceMatching";

export interface GlossaryOccurrenceRange {
  start: number;
  end: number;
}

export function findGlossaryEntryOccurrences(
  text: string,
  entry: GlossaryEntry
): GlossaryOccurrenceRange[] {
  const index = buildGlossarySurfaceIndex([entry]);

  return matchGlossarySurfacesInText(text, index).map((match) => match.range);
}

export type GlossaryOccurrenceDirection = "previous" | "next";

export interface GlossaryOccurrenceCursor {
  entryId: GlossaryEntryId;
  documentEditorId: EditorId;
  index: number;
}

export type GlossaryOccurrenceNavigationOutcome =
  | { kind: "noTargetDocument" }
  | { kind: "noOccurrences" }
  | {
      kind: "navigated";
      range: GlossaryOccurrenceRange;
      cursor: GlossaryOccurrenceCursor;
    };

export interface GlossaryOccurrenceTargetDocument {
  editorId: EditorId;
  content: string;
}

export interface PlanGlossaryOccurrenceNavigationInput {
  entry: GlossaryEntry;
  targetDocument: GlossaryOccurrenceTargetDocument | null;
  direction: GlossaryOccurrenceDirection;
  currentCursor: GlossaryOccurrenceCursor | null;
}

function anchorIndex(
  currentCursor: GlossaryOccurrenceCursor | null,
  entryId: GlossaryEntryId,
  documentEditorId: EditorId,
  occurrenceCount: number
): number | null {
  if (
    !currentCursor ||
    currentCursor.entryId !== entryId ||
    !editorIdEquals(currentCursor.documentEditorId, documentEditorId) ||
    currentCursor.index < 0 ||
    currentCursor.index >= occurrenceCount
  ) {
    return null;
  }

  return currentCursor.index;
}

function resolveOccurrenceIndex(
  direction: GlossaryOccurrenceDirection,
  anchor: number | null,
  occurrenceCount: number
): number {
  if (anchor === null) {
    return direction === "next" ? 0 : occurrenceCount - 1;
  }

  return direction === "next"
    ? (anchor + 1) % occurrenceCount
    : (anchor - 1 + occurrenceCount) % occurrenceCount;
}

export function planGlossaryOccurrenceNavigation(
  input: PlanGlossaryOccurrenceNavigationInput
): GlossaryOccurrenceNavigationOutcome {
  const { entry, targetDocument, direction, currentCursor } = input;

  if (!targetDocument) {
    return { kind: "noTargetDocument" };
  }

  const occurrences = findGlossaryEntryOccurrences(
    targetDocument.content,
    entry
  );

  if (occurrences.length === 0) {
    return { kind: "noOccurrences" };
  }

  const anchor = anchorIndex(
    currentCursor,
    entry.id,
    targetDocument.editorId,
    occurrences.length
  );
  const nextIndex = resolveOccurrenceIndex(
    direction,
    anchor,
    occurrences.length
  );

  return {
    kind: "navigated",
    range: occurrences[nextIndex],
    cursor: {
      entryId: entry.id,
      documentEditorId: targetDocument.editorId,
      index: nextIndex
    }
  };
}
