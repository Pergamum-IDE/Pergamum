import type {
  GlossaryEntry,
  GlossaryEntryId,
  GlossaryEntryKind,
  GlossaryFormId,
  GlossaryWarningPolicy
} from "../shared/glossary";
import {
  isAmbiguousGlossarySurfaceTextMatch,
  type GlossarySurfaceMatchRelation,
  type GlossarySurfaceTextMatch
} from "../shared/glossarySurfaceMatching";
import { canonicalGlossarySurface } from "./glossaryPresentation";

const defaultDescriptionPreviewLength = 96;

export interface GlossaryHoverCardCandidateContent {
  entryId: GlossaryEntryId;
  formId: GlossaryFormId;
  canonicalSurface: string;
  matchedSurface: string;
  relation: GlossarySurfaceMatchRelation;
  warningPolicy: GlossaryWarningPolicy | null;
  kind: GlossaryEntryKind | null;
  descriptionPreview: string;
  isMissingEntry: boolean;
}

export interface GlossaryHoverCardContent {
  matchedSurface: string;
  isAmbiguous: boolean;
  candidates: readonly GlossaryHoverCardCandidateContent[];
}

export function buildGlossaryDescriptionPreview(
  description: string,
  maxLength = defaultDescriptionPreviewLength
): string {
  const normalized = description.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function buildGlossaryHoverCardContent(
  match: GlossarySurfaceTextMatch,
  entries: readonly GlossaryEntry[]
): GlossaryHoverCardContent {
  const entriesById = new Map(
    entries.map((entry) => [entry.id, entry] as const)
  );

  return {
    matchedSurface: match.matchedText,
    isAmbiguous: isAmbiguousGlossarySurfaceTextMatch(match),
    candidates: match.candidates.map((candidate) => {
      const entry = entriesById.get(candidate.entryId);

      return {
        entryId: candidate.entryId,
        formId: candidate.formId,
        canonicalSurface: entry
          ? canonicalGlossarySurface(entry)
          : candidate.surface,
        matchedSurface: match.matchedText,
        relation: candidate.relation,
        warningPolicy: candidate.warningPolicy,
        kind: entry?.kind ?? null,
        descriptionPreview: entry
          ? buildGlossaryDescriptionPreview(entry.description)
          : "",
        isMissingEntry: entry === undefined
      };
    })
  };
}
