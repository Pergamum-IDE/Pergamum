import type {
  GlossaryEntry,
  GlossaryEntryKind,
  UpdateGlossaryEntryInput
} from "../shared/glossary";
import type { EditorSaveState } from "./editorState";

export interface GlossaryEntryDraft {
  entry: GlossaryEntry;
  kind: GlossaryEntryKind;
  description: string;
  saveState: EditorSaveState;
}

export function createGlossaryEntryDraft(
  entry: GlossaryEntry
): GlossaryEntryDraft {
  return {
    entry,
    kind: entry.kind,
    description: entry.description,
    saveState: "clean"
  };
}

export function isGlossaryEntryDraftDirty(draft: GlossaryEntryDraft): boolean {
  return (
    draft.kind !== draft.entry.kind ||
    draft.description !== draft.entry.description
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
    entry: savedEntry
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
    description: draft.description
  };
}
