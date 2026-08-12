import { describe, expect, it } from "vitest";
import type { GlossaryEntry } from "../../src/shared/glossary";
import {
  applyGlossaryEntryDraftSaveResult,
  createGlossaryEntryDraft,
  glossaryEntryDraftUpdateInput,
  isGlossaryEntryDraftDirty,
  markGlossaryEntryDraftSaveFailed,
  markGlossaryEntryDraftSaving,
  updateGlossaryEntryDraftDescription,
  updateGlossaryEntryDraftKind
} from "../../src/renderer/glossaryEntryDraft";

const savedEntry: GlossaryEntry = {
  id: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
  kind: "place",
  description: "王国の首都",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  forms: [
    {
      id: "018f4b8c-7a2b-7c3d-8e4f-223456789abc",
      entryId: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
      surface: "王都",
      relation: null,
      warningPolicy: null,
      isCanonical: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]
};

describe("GlossaryEntryDraft", () => {
  it("starts clean with the saved entry's kind and description", () => {
    const draft = createGlossaryEntryDraft(savedEntry);

    expect(draft.saveState).toBe("clean");
    expect(isGlossaryEntryDraftDirty(draft)).toBe(false);
    expect(draft.kind).toBe("place");
    expect(draft.description).toBe("王国の首都");
  });

  it("becomes dirty when kind changes from the saved snapshot", () => {
    const draft = updateGlossaryEntryDraftKind(
      createGlossaryEntryDraft(savedEntry),
      "person"
    );

    expect(isGlossaryEntryDraftDirty(draft)).toBe(true);
    expect(draft.saveState).toBe("dirty");
  });

  it("becomes dirty when description changes from the saved snapshot", () => {
    const draft = updateGlossaryEntryDraftDescription(
      createGlossaryEntryDraft(savedEntry),
      "新しい説明"
    );

    expect(isGlossaryEntryDraftDirty(draft)).toBe(true);
    expect(draft.saveState).toBe("dirty");
  });

  it("returns to clean when edits are reverted back to the saved snapshot", () => {
    const draft = updateGlossaryEntryDraftDescription(
      updateGlossaryEntryDraftDescription(
        createGlossaryEntryDraft(savedEntry),
        "変更"
      ),
      savedEntry.description
    );

    expect(isGlossaryEntryDraftDirty(draft)).toBe(false);
    expect(draft.saveState).toBe("clean");
  });

  it("adopts the saved API result as the new clean snapshot on save success", () => {
    const dirtyDraft = updateGlossaryEntryDraftKind(
      createGlossaryEntryDraft(savedEntry),
      "person"
    );
    const savingDraft = markGlossaryEntryDraftSaving(dirtyDraft);
    const updatedEntry: GlossaryEntry = {
      ...savedEntry,
      kind: "person",
      updatedAt: "2026-01-02T00:00:00.000Z"
    };

    const savedDraft = applyGlossaryEntryDraftSaveResult(
      savingDraft,
      updatedEntry
    );

    expect(savingDraft.saveState).toBe("saving");
    expect(savedDraft.saveState).toBe("clean");
    expect(savedDraft.entry).toEqual(updatedEntry);
    expect(savedDraft.kind).toBe("person");
    expect(isGlossaryEntryDraftDirty(savedDraft)).toBe(false);
  });

  it("keeps saveState as saving while editing an entry that is mid-save", () => {
    const dirtyDraft = updateGlossaryEntryDraftKind(
      createGlossaryEntryDraft(savedEntry),
      "person"
    );
    const savingDraft = markGlossaryEntryDraftSaving(dirtyDraft);
    const editedWhileSaving = updateGlossaryEntryDraftDescription(
      savingDraft,
      "保存中に加えた編集"
    );

    expect(editedWhileSaving.saveState).toBe("saving");
    expect(editedWhileSaving.description).toBe("保存中に加えた編集");
  });

  it("preserves edits made during a save and marks the draft dirty when they differ from the new snapshot", () => {
    const savingDraft = markGlossaryEntryDraftSaving(
      createGlossaryEntryDraft(savedEntry)
    );
    const editedWhileSaving = updateGlossaryEntryDraftDescription(
      savingDraft,
      "保存中に加えた編集"
    );

    const savedDraft = applyGlossaryEntryDraftSaveResult(
      editedWhileSaving,
      savedEntry
    );

    expect(savedDraft.description).toBe("保存中に加えた編集");
    expect(savedDraft.entry).toEqual(savedEntry);
    expect(savedDraft.saveState).toBe("dirty");
    expect(isGlossaryEntryDraftDirty(savedDraft)).toBe(true);
  });

  it("marks the draft clean when edits made during a save match the new snapshot", () => {
    const savingDraft = markGlossaryEntryDraftSaving(
      createGlossaryEntryDraft(savedEntry)
    );
    const updatedEntry: GlossaryEntry = {
      ...savedEntry,
      description: "保存された説明",
      updatedAt: "2026-01-02T00:00:00.000Z"
    };
    const editedToMatchSnapshot = updateGlossaryEntryDraftDescription(
      savingDraft,
      "保存された説明"
    );

    const savedDraft = applyGlossaryEntryDraftSaveResult(
      editedToMatchSnapshot,
      updatedEntry
    );

    expect(savedDraft.saveState).toBe("clean");
    expect(isGlossaryEntryDraftDirty(savedDraft)).toBe(false);
  });

  it("keeps the draft's edits and marks saveFailed when save fails", () => {
    const dirtyDraft = updateGlossaryEntryDraftDescription(
      createGlossaryEntryDraft(savedEntry),
      "保存に失敗する編集"
    );
    const savingDraft = markGlossaryEntryDraftSaving(dirtyDraft);
    const failedDraft = markGlossaryEntryDraftSaveFailed(savingDraft);

    expect(failedDraft.saveState).toBe("saveFailed");
    expect(failedDraft.description).toBe("保存に失敗する編集");
    expect(failedDraft.entry).toEqual(savedEntry);
    expect(isGlossaryEntryDraftDirty(failedDraft)).toBe(true);
  });

  it("builds the UpdateGlossaryEntryInput from the draft's id, kind, and description", () => {
    const draft = updateGlossaryEntryDraftDescription(
      updateGlossaryEntryDraftKind(
        createGlossaryEntryDraft(savedEntry),
        "person"
      ),
      "更新後の説明"
    );

    expect(glossaryEntryDraftUpdateInput(draft)).toEqual({
      id: savedEntry.id,
      kind: "person",
      description: "更新後の説明"
    });
  });
});
