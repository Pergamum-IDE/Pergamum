import type {
  GlossaryFormMatchBoundary,
  GlossaryEntry,
  GlossaryEntryKind,
  GlossaryFormId,
  GlossaryFormRelation,
  GlossaryNonCanonicalForm,
  GlossaryWarningPolicy,
  UpdateGlossaryEntryInput
} from "../shared/glossary";
import { DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY } from "../shared/glossary";
import type { EditorSaveState } from "./editorState";

export interface GlossaryFormDraft {
  id: string;
  surface: string;
  relation: GlossaryFormRelation;
  warningPolicy: GlossaryWarningPolicy;
  matchBoundaryLeft: GlossaryFormMatchBoundary;
  matchBoundaryRight: GlossaryFormMatchBoundary;
}

export interface GlossaryEntryDraft {
  entry: GlossaryEntry;
  canonicalSurface: string;
  kind: GlossaryEntryKind;
  description: string;
  forms: GlossaryFormDraft[];
  saveState: EditorSaveState;
}

export interface NormalizedGlossaryFormForComparison {
  surface: string;
  relation: GlossaryFormRelation;
  warningPolicy: GlossaryWarningPolicy;
  matchBoundaryLeft: GlossaryFormMatchBoundary;
  matchBoundaryRight: GlossaryFormMatchBoundary;
}

function fallbackRandomId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function createLocalGlossaryFormId(): string {
  const randomUUID = globalThis.crypto?.randomUUID?.() ?? fallbackRandomId();

  return `local:${randomUUID}`;
}

export function isLocalGlossaryFormId(id: string): boolean {
  return id.startsWith("local:");
}

function canonicalSurfaceOf(entry: GlossaryEntry): string {
  return (
    entry.forms.find((form) => form.isCanonical === true)?.surface ??
    ""
  );
}

function isNonCanonicalGlossaryForm(
  form: GlossaryEntry["forms"][number]
): form is GlossaryNonCanonicalForm {
  return form.isCanonical === false;
}

function glossaryFormDraftsFromEntry(
  entry: GlossaryEntry
): GlossaryFormDraft[] {
  return entry.forms
    .filter(isNonCanonicalGlossaryForm)
    .map((form) => ({
      id: form.id,
      surface: form.surface,
      relation: form.relation,
      warningPolicy: form.warningPolicy,
      matchBoundaryLeft: form.matchBoundaryLeft,
      matchBoundaryRight: form.matchBoundaryRight
    }));
}

function compareNormalizedGlossaryForms(
  left: NormalizedGlossaryFormForComparison,
  right: NormalizedGlossaryFormForComparison
): number {
  return (
    left.relation.localeCompare(right.relation) ||
    left.surface.localeCompare(right.surface) ||
    left.warningPolicy.localeCompare(right.warningPolicy) ||
    left.matchBoundaryLeft.localeCompare(right.matchBoundaryLeft) ||
    left.matchBoundaryRight.localeCompare(right.matchBoundaryRight)
  );
}

export function normalizeGlossaryFormsForComparison(
  forms: readonly {
    surface: string;
    relation: GlossaryFormRelation;
    warningPolicy: GlossaryWarningPolicy;
    matchBoundaryLeft: GlossaryFormMatchBoundary;
    matchBoundaryRight: GlossaryFormMatchBoundary;
  }[]
): NormalizedGlossaryFormForComparison[] {
  return forms
    .map((form) => ({
      surface: form.surface.trim(),
      relation: form.relation,
      warningPolicy: form.warningPolicy,
      matchBoundaryLeft: form.matchBoundaryLeft,
      matchBoundaryRight: form.matchBoundaryRight
    }))
    .sort(compareNormalizedGlossaryForms);
}

function areNormalizedGlossaryFormsEqual(
  left: NormalizedGlossaryFormForComparison[],
  right: NormalizedGlossaryFormForComparison[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftForm, index) => {
    const rightForm = right[index];

    return (
      leftForm.surface === rightForm.surface &&
      leftForm.relation === rightForm.relation &&
      leftForm.warningPolicy === rightForm.warningPolicy &&
      leftForm.matchBoundaryLeft === rightForm.matchBoundaryLeft &&
      leftForm.matchBoundaryRight === rightForm.matchBoundaryRight
    );
  });
}

function reconciliationKey(form: {
  surface: string;
  relation: GlossaryFormRelation;
}): string {
  return `${form.relation}\u0000${form.surface.trim()}`;
}

function reconcileLocalGlossaryFormIds(
  forms: GlossaryFormDraft[],
  savedEntry: GlossaryEntry
): GlossaryFormDraft[] {
  const savedFormsByKey = new Map<string, GlossaryFormDraft>();

  for (const form of glossaryFormDraftsFromEntry(savedEntry)) {
    savedFormsByKey.set(reconciliationKey(form), form);
  }

  const usedSavedFormIds = new Set<GlossaryFormId>();

  return forms.map((form) => {
    if (!isLocalGlossaryFormId(form.id)) {
      return form;
    }

    const savedForm = savedFormsByKey.get(reconciliationKey(form));

    if (!savedForm || usedSavedFormIds.has(savedForm.id)) {
      return form;
    }

    usedSavedFormIds.add(savedForm.id);

    return {
      ...form,
      id: savedForm.id
    };
  });
}

export function createGlossaryEntryDraft(
  entry: GlossaryEntry
): GlossaryEntryDraft {
  return {
    entry,
    canonicalSurface: canonicalSurfaceOf(entry),
    kind: entry.kind,
    description: entry.description,
    forms: glossaryFormDraftsFromEntry(entry),
    saveState: "clean"
  };
}

export function isGlossaryEntryDraftDirty(draft: GlossaryEntryDraft): boolean {
  const savedForms = normalizeGlossaryFormsForComparison(
    glossaryFormDraftsFromEntry(draft.entry)
  );
  const draftForms = normalizeGlossaryFormsForComparison(draft.forms);

  return (
    draft.kind !== draft.entry.kind ||
    draft.description !== draft.entry.description ||
    draft.canonicalSurface.trim() !== canonicalSurfaceOf(draft.entry).trim() ||
    !areNormalizedGlossaryFormsEqual(draftForms, savedForms)
  );
}

function withRecomputedSaveState(
  draft: GlossaryEntryDraft
): GlossaryEntryDraft {
  if (draft.saveState === "saving") {
    return draft;
  }

  return {
    ...draft,
    saveState: isGlossaryEntryDraftDirty(draft) ? "dirty" : "clean"
  };
}

export function updateGlossaryEntryDraftKind(
  draft: GlossaryEntryDraft,
  kind: GlossaryEntryKind
): GlossaryEntryDraft {
  return withRecomputedSaveState({ ...draft, kind });
}

export function updateGlossaryEntryDraftDescription(
  draft: GlossaryEntryDraft,
  description: string
): GlossaryEntryDraft {
  return withRecomputedSaveState({ ...draft, description });
}

export function updateGlossaryEntryDraftCanonicalSurface(
  draft: GlossaryEntryDraft,
  canonicalSurface: string
): GlossaryEntryDraft {
  return withRecomputedSaveState({ ...draft, canonicalSurface });
}

export function addGlossaryEntryDraftForm(
  draft: GlossaryEntryDraft,
  relation: GlossaryFormRelation
): GlossaryEntryDraft {
  return withRecomputedSaveState({
    ...draft,
    forms: [
      ...draft.forms,
      {
        id: createLocalGlossaryFormId(),
        surface: "",
        relation,
        warningPolicy: "default",
        matchBoundaryLeft: DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY,
        matchBoundaryRight: DEFAULT_GLOSSARY_FORM_MATCH_BOUNDARY
      }
    ]
  });
}

export function updateGlossaryEntryDraftFormSurface(
  draft: GlossaryEntryDraft,
  formId: string,
  surface: string
): GlossaryEntryDraft {
  return withRecomputedSaveState({
    ...draft,
    forms: draft.forms.map((form) =>
      form.id === formId ? { ...form, surface } : form
    )
  });
}

export function updateGlossaryEntryDraftFormWarningPolicy(
  draft: GlossaryEntryDraft,
  formId: string,
  warningPolicy: GlossaryWarningPolicy
): GlossaryEntryDraft {
  return withRecomputedSaveState({
    ...draft,
    forms: draft.forms.map((form) =>
      form.id === formId ? { ...form, warningPolicy } : form
    )
  });
}

export function deleteGlossaryEntryDraftForm(
  draft: GlossaryEntryDraft,
  formId: string
): GlossaryEntryDraft {
  return withRecomputedSaveState({
    ...draft,
    forms: draft.forms.filter((form) => form.id !== formId)
  });
}

export function markGlossaryEntryDraftSaving(
  draft: GlossaryEntryDraft
): GlossaryEntryDraft {
  return { ...draft, saveState: "saving" };
}

export function markGlossaryEntryDraftSaveFailed(
  draft: GlossaryEntryDraft
): GlossaryEntryDraft {
  return { ...draft, saveState: "saveFailed" };
}

export function applyGlossaryEntryDraftSaveResult(
  draft: GlossaryEntryDraft,
  savedEntry: GlossaryEntry
): GlossaryEntryDraft {
  const nextDraft: GlossaryEntryDraft = {
    ...draft,
    entry: savedEntry,
    forms: reconcileLocalGlossaryFormIds(draft.forms, savedEntry)
  };

  return {
    ...nextDraft,
    saveState: isGlossaryEntryDraftDirty(nextDraft) ? "dirty" : "clean"
  };
}

export function glossaryEntryDraftUpdateInput(
  draft: GlossaryEntryDraft
): UpdateGlossaryEntryInput {
  return {
    id: draft.entry.id,
    kind: draft.kind,
    description: draft.description,
    canonicalSurface: draft.canonicalSurface.trim(),
    forms: draft.forms
      .map((form) => ({
        ...form,
        surface: form.surface.trim()
      }))
      .filter((form) => form.surface.length > 0)
      .map((form) => ({
        id: isLocalGlossaryFormId(form.id) ? undefined : form.id,
        surface: form.surface,
        relation: form.relation,
        warningPolicy: form.warningPolicy,
        matchBoundaryLeft: form.matchBoundaryLeft,
        matchBoundaryRight: form.matchBoundaryRight
      }))
  };
}
