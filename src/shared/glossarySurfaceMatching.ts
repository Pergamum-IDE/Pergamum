import type {
  GlossaryEntry,
  GlossaryEntryId,
  GlossaryForm,
  GlossaryFormId,
  GlossaryWarningPolicy
} from "./glossary";

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
        warningPolicy: warningPolicyForForm(form)
      });
    }
  }

  return {
    entries: indexEntries.sort(compareIndexEntries)
  };
}

export function matchGlossarySurfacesInText(
  text: string,
  index: GlossarySurfaceIndex
): GlossarySurfaceTextMatch[] {
  const matches: GlossarySurfaceTextMatch[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let longestSurfaceLength = 0;
    const matchingEntries: GlossarySurfaceIndexEntry[] = [];

    for (const entry of index.entries) {
      if (!text.startsWith(entry.surface, cursor)) {
        continue;
      }

      if (entry.surface.length > longestSurfaceLength) {
        longestSurfaceLength = entry.surface.length;
        matchingEntries.length = 0;
      }

      if (entry.surface.length === longestSurfaceLength) {
        matchingEntries.push(entry);
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
