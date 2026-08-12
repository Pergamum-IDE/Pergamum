import { describe, expect, it } from "vitest";
import {
  createFileDocument,
  createProjectDocument,
  createUntitledDocument,
  updateCurrentDocumentContent
} from "../../src/renderer/currentDocument";
import { createGlossaryEntryCurrentEditor } from "../../src/renderer/currentEditor";
import {
  currentDocumentForOpenedFile,
  findProjectDocumentByEditorId
} from "../../src/renderer/projectDocumentResolution";
import {
  createInitialOpenDocumentsState,
  createOpenDocumentsStateWithDocument,
  documentTabs,
  openOrActivateEditor,
  openOrActivateDocument,
  replaceOpenDocument,
  updateActiveOpenDocument
} from "../../src/renderer/openDocuments";
import {
  createEditorIdForPath,
  createGlossaryEntryEditorId,
  createProjectDocumentEditorId,
  createUntitledEditorId,
  editorIdEquals,
  type ActiveProjectContext
} from "../../src/shared/editorId";
import type { PergamumProject, ProjectDocument } from "../../src/shared/api";
import type { GlossaryEntry } from "../../src/shared/glossary";

const projectContext: ActiveProjectContext = {
  rootPath: "C:\\Novel"
};

const firstProjectDocument: ProjectDocument = {
  relativePath: "chapter-01.md",
  name: "chapter-01.md"
};

const secondProjectDocument: ProjectDocument = {
  relativePath: "chapter-02.md",
  name: "chapter-02.md"
};

const project: PergamumProject = {
  rootPath: projectContext.rootPath,
  name: "Novel",
  config: null,
  documents: [firstProjectDocument, secondProjectDocument]
};

const glossaryEntry: GlossaryEntry = {
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

describe("OpenDocumentsState", () => {
  it("does not duplicate a project document opened with relative path case differences", () => {
    const projectDocument = createProjectDocument(
      firstProjectDocument,
      "project content"
    );
    const sameProjectDocumentWithDifferentCase = createProjectDocument(
      {
        relativePath: "Chapter-01.md",
        name: "Chapter-01.md"
      },
      "other content"
    );
    let state = createOpenDocumentsStateWithDocument(
      projectDocument,
      projectContext
    );

    state = openOrActivateDocument(
      state,
      sameProjectDocumentWithDifferentCase,
      projectContext
    );

    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createProjectDocumentEditorId("chapter-01.md", projectContext)
      )
    ).toBe(true);
    expect(state.documents[0].editor.kind).toBe("markdown");
    expect(state.documents[0].editor.document.content).toBe("project content");
  });

  it("rejects a file CurrentDocument that would be identified as a projectDocument without open state", () => {
    expect(() =>
      openOrActivateDocument(
        createInitialOpenDocumentsState(),
        createFileDocument({
          path: "C:\\Novel\\chapter-01.md",
          content: "content"
        }),
        projectContext
      )
    ).toThrow("CurrentEditor kind does not match its EditorId.");
  });

  it("rejects a file CurrentDocument that would be identified as an already-open projectDocument", () => {
    const state = createOpenDocumentsStateWithDocument(
      createProjectDocument(firstProjectDocument, "project content"),
      projectContext
    );

    expect(() =>
      openOrActivateDocument(
        state,
        createFileDocument({
          path: "C:\\Novel\\chapter-01.md",
          content: "content"
        }),
        projectContext
      )
    ).toThrow("CurrentEditor kind does not match its EditorId.");
  });

  it("matches Windows project listings case-insensitively without changing display paths", () => {
    const projectWithMixedCaseListing: PergamumProject = {
      ...project,
      documents: [
        {
          relativePath: "Chapter-01.md",
          name: "Chapter-01.md"
        }
      ]
    };
    const document = currentDocumentForOpenedFile(
      {
        path: "C:\\novel\\chapter-01.md",
        content: "content"
      },
      projectWithMixedCaseListing,
      projectContext
    );

    expect(document).toMatchObject({
      kind: "project",
      relativePath: "Chapter-01.md"
    });
  });

  it("matches project listings through EditorId identity semantics", () => {
    const editorId = createEditorIdForPath(
      "C:\\novel\\Chapter-01.md",
      projectContext
    );

    expect(
      findProjectDocumentByEditorId(project, editorId, projectContext)
    ).toBe(firstProjectDocument);
  });

  it("creates a project CurrentDocument for a listed project file path", () => {
    const document = currentDocumentForOpenedFile(
      {
        path: "C:\\novel\\Chapter-01.md",
        content: "content"
      },
      project,
      projectContext
    );

    expect(document).toMatchObject({
      kind: "project",
      relativePath: "chapter-01.md"
    });
  });

  it("does not fall back to a file CurrentDocument for an unlisted project path", () => {
    expect(() =>
      currentDocumentForOpenedFile(
        {
          path: "C:\\Novel\\missing.md",
          content: "content"
        },
        project,
        projectContext
      )
    ).toThrow("Project document is not listed in the active project.");
  });

  it("keeps the existing multi-tab behavior for standalone files", () => {
    const firstDocument = createFileDocument({
      path: "D:\\Outside\\first.md",
      content: "first"
    });
    const secondDocument = createFileDocument({
      path: "D:\\Outside\\second.md",
      content: "second"
    });
    let state = createInitialOpenDocumentsState();

    state = openOrActivateDocument(state, firstDocument, projectContext);
    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createEditorIdForPath("D:\\Outside\\first.md", projectContext)
      )
    ).toBe(true);

    state = openOrActivateDocument(state, secondDocument, projectContext);
    expect(state.documents).toHaveLength(2);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createEditorIdForPath("D:\\Outside\\second.md", projectContext)
      )
    ).toBe(true);

    state = openOrActivateDocument(state, firstDocument, projectContext);
    expect(state.documents).toHaveLength(2);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createEditorIdForPath("D:\\Outside\\first.md", projectContext)
      )
    ).toBe(true);
  });

  it("keeps untitled EditorIds session-stable while allocating new untitled IDs", () => {
    const initialState = createInitialOpenDocumentsState();
    const initialEditorId = initialState.activeDocumentId;
    const updatedState = updateActiveOpenDocument(initialState, (document) =>
      updateCurrentDocumentContent(document, "changed")
    );
    const nextState = openOrActivateDocument(
      updatedState,
      createUntitledDocument(),
      projectContext
    );

    expect(editorIdEquals(updatedState.activeDocumentId, initialEditorId)).toBe(
      true
    );
    expect(nextState.documents).toHaveLength(2);
    expect(
      editorIdEquals(nextState.activeDocumentId, createUntitledEditorId(2))
    ).toBe(true);
    expect(nextState.nextUntitledId).toBe(3);
  });

  it("does not reuse untitled session IDs after an OpenDocumentsState reset", () => {
    const firstState = createInitialOpenDocumentsState();
    const resetState = createInitialOpenDocumentsState(
      firstState.nextUntitledId
    );

    expect(
      editorIdEquals(firstState.activeDocumentId, createUntitledEditorId(1))
    ).toBe(true);
    expect(
      editorIdEquals(resetState.activeDocumentId, createUntitledEditorId(2))
    ).toBe(true);
    expect(
      editorIdEquals(firstState.activeDocumentId, resetState.activeDocumentId)
    ).toBe(false);
  });

  it("rejects replacement with a file CurrentDocument that would be identified as a projectDocument", () => {
    const existingProjectDocument = createProjectDocument(
      firstProjectDocument,
      "existing"
    );
    let state = createOpenDocumentsStateWithDocument(
      existingProjectDocument,
      projectContext
    );
    state = openOrActivateDocument(
      state,
      createUntitledDocument(),
      projectContext
    );

    const untitledEditorId = state.activeDocumentId;

    expect(() =>
      replaceOpenDocument(
        state,
        untitledEditorId,
        createFileDocument({
          path: "C:\\Novel\\chapter-01.md",
          content: "saved"
        }),
        projectContext
      )
    ).toThrow("CurrentEditor kind does not match its EditorId.");
  });

  it("replaces the initial untitled tab when a project document is opened", () => {
    const state = openOrActivateDocument(
      createInitialOpenDocumentsState(),
      createProjectDocument(secondProjectDocument, "second"),
      projectContext
    );

    expect(documentTabs(state)).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createProjectDocumentEditorId("chapter-02.md", projectContext)
      )
    ).toBe(true);
  });

  it("keeps Markdown documents and glossary entries in one Open Documents state", () => {
    const projectDocument = createProjectDocument(
      firstProjectDocument,
      "project content"
    );
    let state = createOpenDocumentsStateWithDocument(
      projectDocument,
      projectContext
    );

    state = openOrActivateEditor(
      state,
      createGlossaryEntryCurrentEditor(glossaryEntry),
      projectContext
    );

    expect(state.documents).toHaveLength(2);
    expect(documentTabs(state)).toEqual([
      {
        id: createProjectDocumentEditorId("chapter-01.md", projectContext),
        title: "chapter-01.md",
        isDirty: false
      },
      {
        id: createGlossaryEntryEditorId(glossaryEntry.id, projectContext),
        title: "王都",
        isDirty: false
      }
    ]);
  });

  it("does not duplicate the same glossary entry when reopened", () => {
    const firstEditor = createGlossaryEntryCurrentEditor(glossaryEntry);
    const secondEditor = createGlossaryEntryCurrentEditor({
      ...glossaryEntry,
      description: "changed after the first open"
    });
    let state = openOrActivateEditor(
      createInitialOpenDocumentsState(),
      firstEditor,
      projectContext
    );

    state = openOrActivateEditor(state, secondEditor, projectContext);

    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createGlossaryEntryEditorId(glossaryEntry.id, projectContext)
      )
    ).toBe(true);
    expect(state.documents[0].editor.kind).toBe("glossaryEntry");
    expect(state.documents[0].editor.entry.description).toBe("王国の首都");
  });
});
