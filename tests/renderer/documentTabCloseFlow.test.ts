import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  buildDirtyCloseConfirmDialogOptions,
  runEditorCloseFlow
} from "../../src/renderer/documentTabCloseFlow";
import { AppDialogError } from "../../src/renderer/dialog/appDialogTypes";
import {
  createInitialOpenDocumentsState,
  updateActiveOpenDocument
} from "../../src/renderer/openDocuments";
import { updateCurrentDocumentContent } from "../../src/renderer/currentDocument";
import { t, type Translate } from "../../src/shared/i18n";
import { createProjectDocumentEditorId } from "../../src/shared/editorId";

const translateEn: Translate = (key, values) => t("en", key, values);

function cleanState() {
  return createInitialOpenDocumentsState();
}

function dirtyState() {
  return updateActiveOpenDocument(createInitialOpenDocumentsState(), (document) =>
    updateCurrentDocumentContent(document, "changed")
  );
}

describe("buildDirtyCloseConfirmDialogOptions (#184)", () => {
  it("uses icon.kind 'warning', not an SVG file name", () => {
    const options = buildDirtyCloseConfirmDialogOptions(translateEn);

    expect(options.icon).toEqual({ kind: "warning", tooltip: "Warning" });
  });

  it("passes clipboardText: null", () => {
    const options = buildDirtyCloseConfirmDialogOptions(translateEn);

    expect(options.clipboardText).toBeNull();
  });

  it("is a destructive, two-choice dialog with a concrete confirm label (not a generic 'Yes')", () => {
    const options = buildDirtyCloseConfirmDialogOptions(translateEn);

    expect(options.tone).toBe("destructive");
    expect(options.confirmLabel).toBe("Discard Changes and Close");
    expect(options.confirmLabel?.toLowerCase()).not.toBe("yes");
    expect(options.cancelLabel).toBe("Cancel");
  });

  it("uses translated strings for the title and message", () => {
    const options = buildDirtyCloseConfirmDialogOptions(translateEn);

    expect(options.title).toBe("Unsaved Changes");
    expect(options.message).toEqual({
      kind: "plainText",
      text: "This tab has unsaved changes.\nClosing it will discard the unsaved changes."
    });
  });

  it("disables backdrop-click dismissal — an accidental backdrop click must not discard unsaved changes (#184 follow-up)", () => {
    const options = buildDirtyCloseConfirmDialogOptions(translateEn);

    expect(options.dismissOnBackdropClick).toBe(false);
  });

  it("continues to build binary confirm options, not choice dialog options", () => {
    const source = readFileSync("src/renderer/documentTabCloseFlow.ts", "utf8");

    expect(source).toContain("AppConfirmDialogOptions");
    expect(source).toContain("AppConfirmDialogResult");
    expect(source).not.toContain("AppChoiceDialogOptions");
    expect(source).not.toContain("AppChoiceDialogResult");
  });
});

describe("runEditorCloseFlow (#184)", () => {
  it("closes a clean editor without ever calling confirmDialog", async () => {
    const state = cleanState();
    const confirmDialog = vi.fn();
    const onClose = vi.fn();

    await runEditorCloseFlow(undefined, {
      state,
      translate: translateEn,
      confirmDialog,
      onClose
    });

    expect(confirmDialog).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(state.activeDocumentId);
  });

  it("confirms through the dialog for a dirty editor, then closes on confirm", async () => {
    const state = dirtyState();
    const confirmDialog = vi.fn().mockResolvedValue("confirm");
    const onClose = vi.fn();

    await runEditorCloseFlow(undefined, {
      state,
      translate: translateEn,
      confirmDialog,
      onClose
    });

    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(state.activeDocumentId);
  });

  it("does not close a dirty editor when the dialog resolves cancel", async () => {
    const state = dirtyState();
    const confirmDialog = vi.fn().mockResolvedValue("cancel");
    const onClose = vi.fn();

    await runEditorCloseFlow(undefined, {
      state,
      translate: translateEn,
      confirmDialog,
      onClose
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("absorbs a concurrent AppDialogError('dialogAlreadyOpen') without throwing or closing", async () => {
    const state = dirtyState();
    const confirmDialog = vi
      .fn()
      .mockRejectedValue(new AppDialogError("dialogAlreadyOpen"));
    const onClose = vi.fn();

    await expect(
      runEditorCloseFlow(undefined, {
        state,
        translate: translateEn,
        confirmDialog,
        onClose
      })
    ).resolves.toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("rethrows an unrelated error from confirmDialog", async () => {
    const state = dirtyState();
    const confirmDialog = vi.fn().mockRejectedValue(new Error("boom"));
    const onClose = vi.fn();

    await expect(
      runEditorCloseFlow(undefined, {
        state,
        translate: translateEn,
        confirmDialog,
        onClose
      })
    ).rejects.toThrow("boom");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does nothing for an explicit editorId that is not open — never closes an unrelated editor", async () => {
    const state = cleanState();
    const confirmDialog = vi.fn();
    const onClose = vi.fn();
    const unrelatedEditorId = createProjectDocumentEditorId("not-open.md", {
      rootPath: "C:\\Novel"
    });

    await runEditorCloseFlow(unrelatedEditorId, {
      state,
      translate: translateEn,
      confirmDialog,
      onClose
    });

    expect(confirmDialog).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
