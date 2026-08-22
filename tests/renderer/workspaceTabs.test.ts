import { describe, expect, it } from "vitest";
import {
  createProjectDocumentEditorId,
  type ActiveProjectContext
} from "../../src/shared/editorId";
import {
  documentWorkspaceTabId,
  specialWorkspaceTabId,
  workspaceTabIdEquals,
  workspaceTabKey,
  workspaceTabs,
  type SpecialWorkspaceTab
} from "../../src/renderer/workspaceTabs";

const projectContext: ActiveProjectContext = { rootPath: "C:\\Novel" };
const documentEditorId = createProjectDocumentEditorId(
  "chapter-01.md",
  projectContext
);
const settingsTab: SpecialWorkspaceTab = {
  kind: "special",
  id: "settings",
  title: "Settings"
};

describe("workspace tabs (#181)", () => {
  it("keeps Settings as a named special tab identity outside EditorId", () => {
    expect(specialWorkspaceTabId("settings")).toEqual({
      kind: "special",
      id: "settings"
    });
    expect(documentWorkspaceTabId(documentEditorId)).toEqual({
      kind: "document",
      editorId: documentEditorId
    });
  });

  it("does not consider Settings equal to a document workspace tab", () => {
    expect(
      workspaceTabIdEquals(
        specialWorkspaceTabId("settings"),
        documentWorkspaceTabId(documentEditorId)
      )
    ).toBe(false);
  });

  it("appends special tabs after document tabs without duplicating document state", () => {
    expect(
      workspaceTabs(
        [
          {
            id: documentEditorId,
            title: "chapter-01.md",
            isDirty: false,
            isExternalMarkdownFile: false
          }
        ],
        [settingsTab]
      )
    ).toEqual([
      {
        kind: "document",
        id: documentEditorId,
        title: "chapter-01.md",
        isDirty: false,
        isExternalMarkdownFile: false
      },
      settingsTab
    ]);
  });

  it("uses distinct stable keys for document and special tabs", () => {
    expect(workspaceTabKey(documentWorkspaceTabId(documentEditorId))).toContain(
      "document:"
    );
    expect(workspaceTabKey(specialWorkspaceTabId("settings"))).toBe(
      "special:settings"
    );
  });
});
