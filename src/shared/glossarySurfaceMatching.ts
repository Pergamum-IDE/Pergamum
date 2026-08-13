import type {
  GlossaryEntry,
  GlossaryEntryId,
  GlossaryForm,
  GlossaryFormId,
  GlossaryFormMatchBoundary,
  GlossaryWarningPolicy
} from "./glossary";
import { shouldAcceptGlossarySurfaceBoundary } from "./glossarySurfaceBoundary";

export type GlossarySurfaceMatchRelation =
  | "canonical"
  | "alias"
  | "variant";

export interface GlossarySurfaceMatchingOptions {
  minimumSurfaceLength?: number;
}

export interface GlossarySurfaceIndexEntry {
  entryId: GlossaryEntryId;
  formId: GlossaryFormId;
  surface: string;
  relation: GlossarySurfaceMatchRelation;
  warningPolicy: GlossaryWarningPolicy | null;
  matchBoundaryStart: GlossaryFormMatchBoundary;
  matchBoundaryEnd: GlossaryFormMatchBoundary;
}

export interface GlossarySurfaceIndex {
  readonly entries: readonly GlossarySurfaceIndexEntry[];
}

export interface GlossarySurfaceMatchCandidate {
  entryId: GlossaryEntryId;
  formId: GlossaryFormId;
  surface: string;
  relation: GlossarySurfaceMatchRelation;
  warningPolicy: GlossaryWarningPolicy | null;
}

export interface GlossarySurfaceTextMatch {
  matchedText: string;
  range: {
    start: number;
    end: number;
  };
  candidates: readonly GlossarySurfaceMatchCandidate[];
}

const defaultMinimumSurfaceLength = 2;

const relationSortRank: Record<GlossarySurfaceMatchRelation, number> = {
  canonical: 0,
  alias: 1,
  variant: 2
};

interface RawGlossarySurfaceMatch {
  start: number;
  end: number;
  entry: GlossarySurfaceIndexEntry;
}

function normalizedMinimumSurfaceLength(
  options?: GlossarySurfaceMatchingOptions
): number {
  return Math.max(
    0,
    Math.floor(options?.minimumSurfaceLength ?? defaultMinimumSurfaceLength)
  );
}

function surfaceCharacterLength(surface: string): number {
  return Array.from(surface).length;
}

function relationForForm(form: GlossaryForm): GlossarySurfaceMatchRelation {
  return form.isCanonical ? "canonical" : form.relation;
}

function warningPolicyForForm(
  form: GlossaryForm
): GlossaryWarningPolicy | null {
  return form.isCanonical ? null : form.warningPolicy;
}

function compareIndexEntries(
  left: GlossarySurfaceIndexEntry,
  right: GlossarySurfaceIndexEntry
): number {
  return (
    right.surface.length - left.surface.length ||
    left.surface.localeCompare(right.surface) ||
    relationSortRank[left.relation] - relationSortRank[right.relation] ||
    left.entryId.localeCompare(right.entryId) ||
    left.formId.localeCompare(right.formId)
  );
}

function compareCandidates(
  left: GlossarySurfaceMatchCandidate,
  right: GlossarySurfaceMatchCandidate
): number {
  return (
    relationSortRank[left.relation] - relationSortRank[right.relation] ||
    left.entryId.localeCompare(right.entryId) ||
    left.formId.localeCompare(right.formId)
  );
}

function candidateFromIndexEntry(
  entry: GlossarySurfaceIndexEntry
): GlossarySurfaceMatchCandidate {
  return {
    entryId: entry.entryId,
    formId: entry.formId,
    surface: entry.surface,
    relation: entry.relation,
    warningPolicy: entry.warningPolicy
  };
}

export function buildGlossarySurfaceIndex(
  entries: readonly GlossaryEntry[],
  options?: GlossarySurfaceMatchingOptions
): GlossarySurfaceIndex {
  const minimumSurfaceLength = normalizedMinimumSurfaceLength(options);
  const indexEntries: GlossarySurfaceIndexEntry[] = [];

  for (const entry of entries) {
    for (const form of entry.forms) {
      const surface = form.surface.trim();

      if (
        surface.length === 0 ||
        surfaceCharacterLength(surface) < minimumSurfaceLength
      ) {
        continue;
      }

      indexEntries.push({
        entryId: entry.id,
        formId: form.id,
        surface,
        relation: relationForForm(form),
        warningPolicy: warningPolicyForForm(form),
        matchBoundaryStart: form.matchBoundaryStart,
        matchBoundaryEnd: form.matchBoundaryEnd
      });
    }
  }

  return {
    entries: indexEntries.sort(compareIndexEntries)
  };
}

function collectRawGlossarySurfaceMatches(
  text: string,
  index: GlossarySurfaceIndex
): RawGlossarySurfaceMatch[] {
  const rawMatches: RawGlossarySurfaceMatch[] = [];

  for (let cursor = 0; cursor < text.length; cursor += 1) {
    for (const entry of index.entries) {
      if (!text.startsWith(entry.surface, cursor)) {
        continue;
      }

      rawMatches.push({
        start: cursor,
        end: cursor + entry.surface.length,
        entry
      });
    }
  }

  return rawMatches;
}

function isBoundaryAcceptedRawMatch(
  text: string,
  rawMatch: RawGlossarySurfaceMatch
): boolean {
  return shouldAcceptGlossarySurfaceBoundary({
    text,
    start: rawMatch.start,
    end: rawMatch.end,
    matchBoundaryStart: rawMatch.entry.matchBoundaryStart,
    matchBoundaryEnd: rawMatch.entry.matchBoundaryEnd
  });
}

function groupAcceptedRawMatches(
  rawMatches: readonly RawGlossarySurfaceMatch[]
): Map<string, RawGlossarySurfaceMatch[]> {
  const matchesByRange = new Map<string, RawGlossarySurfaceMatch[]>();

  for (const rawMatch of rawMatches) {
    const rangeKey = `${rawMatch.start}:${rawMatch.end}`;
    const rangeMatches = matchesByRange.get(rangeKey);

    if (rangeMatches) {
      rangeMatches.push(rawMatch);
    } else {
      matchesByRange.set(rangeKey, [rawMatch]);
    }
  }

  return matchesByRange;
}

export function matchGlossarySurfacesInText(
  text: string,
  index: GlossarySurfaceIndex
): GlossarySurfaceTextMatch[] {
  const matches: GlossarySurfaceTextMatch[] = [];
  const matchesByRange = groupAcceptedRawMatches(
    collectRawGlossarySurfaceMatches(text, index).filter((rawMatch) =>
      isBoundaryAcceptedRawMatch(text, rawMatch)
    )
  );
  let cursor = 0;

  while (cursor < text.length) {
    let longestSurfaceLength = 0;
    let matchingEntries: GlossarySurfaceIndexEntry[] = [];

    for (const rangeMatches of matchesByRange.values()) {
      const [firstMatch] = rangeMatches;

      if (!firstMatch || firstMatch.start !== cursor) {
        continue;
      }

      const surfaceLength = firstMatch.end - firstMatch.start;

      if (surfaceLength > longestSurfaceLength) {
        longestSurfaceLength = surfaceLength;
        matchingEntries = rangeMatches.map((rawMatch) => rawMatch.entry);
      }
    }

    if (matchingEntries.length === 0) {
      cursor += 1;
      continue;
    }

    const end = cursor + longestSurfaceLength;

    matches.push({
      matchedText: text.slice(cursor, end),
      range: {
        start: cursor,
        end
      },
      candidates: matchingEntries
        .map(candidateFromIndexEntry)
        .sort(compareCandidates)
    });

    cursor = end;
  }

  return matches;
}

export function isAmbiguousGlossarySurfaceTextMatch(
  match: GlossarySurfaceTextMatch
): boolean {
  return match.candidates.length > 1;
}
