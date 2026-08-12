import { describe, expect, it } from "vitest";
import type { GlossaryEntry } from "../../src/shared/glossary";
import {
  createLoadedGlossarySidebarState,
  preserveGlossarySelection,
  shouldApplyGlossaryLoadResult
} from "../../src/renderer/glossarySidebarState";

function entry(id: string, surface: string): GlossaryEntry {
  return {
    id,
    kind: "term",
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    forms: [
      {
        id: `${id}-form`,
        entryId: id,
        surface,
        relation: null,
        warningPolicy: null,
        isCanonical: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  };
}

const existingEntry = entry("018f4b8c-7a2b-7c3d-8e4f-123456789abc", "王都");
const newlyCreatedEntry = entry(
  "018f4b8c-7a2b-7c3d-8e4f-223456789abd",
  "アルセリア"
);

describe("GlossarySidebarState reload behavior (create/update follow-up)", () => {
  it("keeps the current selection when it still exists after a reload", () => {
    const state = createLoadedGlossarySidebarState(
      [existingEntry, newlyCreatedEntry],
      existingEntry.id
    );

    expect(state.status).toBe("loaded");
    expect(state.entries).toEqual([existingEntry, newlyCreatedEntry]);
    expect(state.selectedEntryId).toBe(existingEntry.id);
  });

  it("surfaces a newly created entry in the reloaded list without forcing selection", () => {
    const state = createLoadedGlossarySidebarState(
      [existingEntry, newlyCreatedEntry],
      null
    );

    expect(state.entries.map((e) => e.id)).toContain(newlyCreatedEntry.id);
    expect(state.selectedEntryId).toBeNull();
  });

  it("clears the selection once the selected entry disappears from a reload", () => {
    expect(
      preserveGlossarySelection([newlyCreatedEntry], existingEntry.id)
    ).toBeNull();
  });

  it("only applies the most recent of overlapping reload requests", () => {
    expect(shouldApplyGlossaryLoadResult(2, 1)).toBe(false);
    expect(shouldApplyGlossaryLoadResult(2, 2)).toBe(true);
  });
});
