import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../../src/shared/api";
import {
  createGlossaryEntryEditorId,
  createProjectDocumentEditorId,
  editorIdEquals,
  isProjectScopedEditorId,
  type ActiveProjectContext
} from "../../src/shared/editorId";
import type { GlossaryEntry } from "../../src/shared/glossary";
import { createProjectDocument } from "../../src/renderer/currentDocument";
import { createGlossaryEntryCurrentEditor } from "../../src/renderer/currentEditor";
import {
  createOpenDocumentsStateWithDocument,
  openOrActivateEditor,
  type OpenDocumentsState
} from "../../src/renderer/openDocuments";
import {
  loadFirstProjectDocumentIfCurrent,
  openFirstProjectDocumentAfterContextSwitch,
  ProjectActivationLifetime,
  resetOpenDocumentsForProjectContextSwitch
} from "../../src/renderer/projectActivationState";

const oldProjectContext: ActiveProjectContext = {
  rootPath: "C:\\OldNovel"
};

const newProjectContext: ActiveProjectContext = {
  rootPath: "C:\\NewNovel"
};

const oldDocument: ProjectDocument = {
  relativePath: "old-chapter.md",
  name: "old-chapter.md"
};

const newDocument: ProjectDocument = {
  relativePath: "new-chapter.md",
  name: "new-chapter.md"
};

const oldGlossaryEntry: GlossaryEntry = {
  id: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
  kind: "term",
  description: "旧 Project の用語",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  forms: [
    {
      id: "018f4b8c-7a2b-7c3d-8e4f-223456789abc",
      entryId: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
      surface: "旧用語",
      relation: null,
      warningPolicy: null,
      isCanonical: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]
};

function oldProjectScopedOpenDocuments(): OpenDocumentsState {
  const state = createOpenDocumentsStateWithDocument(
    createProjectDocument(oldDocument, "old content"),
    oldProjectContext,
    7
  );

  return openOrActivateEditor(
    state,
    createGlossaryEntryCurrentEditor(oldGlossaryEntry),
    oldProjectContext
  );
}

function expectOnlyUntitledEditor(state: OpenDocumentsState): void {
  expect(state.documents).toHaveLength(1);
  expect(state.documents[0].editor.kind).toBe("markdown");
  expect(state.documents[0].editor.kind === "markdown").toBe(true);
  expect(
    state.documents[0].editor.kind === "markdown" &&
      state.documents[0].editor.document.kind
  ).toBe("untitled");
  expect(isProjectScopedEditorId(state.activeDocumentId)).toBe(false);
  expect(state.documents.some((document) => document.id.kind === "glossaryEntry"))
    .toBe(false);
  expect(state.documents.some((document) => document.id.kind === "projectDocument"))
    .toBe(false);
}

function deferred<TResult>(): {
  promise: Promise<TResult>;
  resolve: (value: TResult) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: TResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<TResult>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject
  };
}

function applyLoadedFirstDocument(
  state: OpenDocumentsState,
  document: ReturnType<typeof createProjectDocument>,
  context: ActiveProjectContext
): OpenDocumentsState {
  return openFirstProjectDocumentAfterContextSwitch(
    state,
    document,
    context
  );
}

describe("project activation state", () => {
  it("discards old project-scoped Open Editors at Project Context switch start", () => {
    const resetState = resetOpenDocumentsForProjectContextSwitch(
      oldProjectScopedOpenDocuments()
    );

    expectOnlyUntitledEditor(resetState);
  });

  it("does not restore an old Glossary Editor when first Project document loading fails", async () => {
    const lifetime = new ProjectActivationLifetime();
    const token = lifetime.startProjectContextSwitch();
    const failedLoad = deferred<ReturnType<typeof createProjectDocument>>();
    let state = oldProjectScopedOpenDocuments();
    state = resetOpenDocumentsForProjectContextSwitch(state);

    const loadedDocument = loadFirstProjectDocumentIfCurrent(
      lifetime,
      token,
      () => failedLoad.promise
    );
    lifetime.startProjectContextSwitch();
    failedLoad.reject(new Error("could not read first document"));

    await expect(
      loadedDocument
    ).resolves.toBeNull();

    expectOnlyUntitledEditor(state);
  });

  it("does not let an old Project activation overwrite a newer Project activation", async () => {
    const lifetime = new ProjectActivationLifetime();
    const projectBToken = lifetime.startProjectContextSwitch();
    const projectBLoad = deferred<ReturnType<typeof createProjectDocument>>();
    let state = resetOpenDocumentsForProjectContextSwitch(
      oldProjectScopedOpenDocuments()
    );

    const projectBDocument = loadFirstProjectDocumentIfCurrent(
      lifetime,
      projectBToken,
      () => projectBLoad.promise
    ).then((document) => {
      if (document) {
        state = applyLoadedFirstDocument(state, document, {
          rootPath: "C:\\ProjectB"
        });
      }
    });

    const projectCToken = lifetime.startProjectContextSwitch();
    const projectCLoad = deferred<ReturnType<typeof createProjectDocument>>();
    state = resetOpenDocumentsForProjectContextSwitch(state);
    const projectCDocument = loadFirstProjectDocumentIfCurrent(
      lifetime,
      projectCToken,
      () => projectCLoad.promise
    ).then((document) => {
      if (document) {
        state = applyLoadedFirstDocument(state, document, newProjectContext);
      }
    });

    projectBLoad.resolve(
      createProjectDocument(
        {
          relativePath: "project-b.md",
          name: "project-b.md"
        },
        "project B"
      )
    );
    await projectBDocument;
    expectOnlyUntitledEditor(state);

    projectCLoad.resolve(
      createProjectDocument(newDocument, "new content"),
    );
    await projectCDocument;

    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createProjectDocumentEditorId(newDocument.relativePath, newProjectContext)
      )
    ).toBe(true);
  });

  it("does not let delayed first document loading overwrite explicit Editor activation", async () => {
    const lifetime = new ProjectActivationLifetime();
    const token = lifetime.startProjectContextSwitch();
    const pendingLoad = deferred<ReturnType<typeof createProjectDocument>>();
    let state = resetOpenDocumentsForProjectContextSwitch(
      oldProjectScopedOpenDocuments()
    );
    const loadedDocument = loadFirstProjectDocumentIfCurrent(
      lifetime,
      token,
      () => pendingLoad.promise
    ).then((document) => {
      if (document) {
        state = applyLoadedFirstDocument(state, document, newProjectContext);
      }
    });

    lifetime.markExplicitEditorActivation();
    state = openOrActivateEditor(
      state,
      createGlossaryEntryCurrentEditor(oldGlossaryEntry),
      newProjectContext
    );

    pendingLoad.resolve(createProjectDocument(newDocument, "new content"));
    await loadedDocument;

    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createGlossaryEntryEditorId(oldGlossaryEntry.id, newProjectContext)
      )
    ).toBe(true);
  });

  it("activates the new Project first document after a successful load", async () => {
    const lifetime = new ProjectActivationLifetime();
    const token = lifetime.startProjectContextSwitch();
    const pendingLoad = deferred<ReturnType<typeof createProjectDocument>>();
    let state = resetOpenDocumentsForProjectContextSwitch(
      oldProjectScopedOpenDocuments()
    );
    const loadedDocument = loadFirstProjectDocumentIfCurrent(
      lifetime,
      token,
      () => pendingLoad.promise
    ).then((document) => {
      if (document) {
        state = applyLoadedFirstDocument(state, document, newProjectContext);
      }
    });

    pendingLoad.resolve(createProjectDocument(newDocument, "new content"));
    await loadedDocument;

    expect(state.documents).toHaveLength(1);
    expect(
      editorIdEquals(
        state.activeDocumentId,
        createProjectDocumentEditorId(newDocument.relativePath, newProjectContext)
      )
    ).toBe(true);
    expect(state.documents[0].editor.kind).toBe("markdown");
    expect(
      state.documents[0].editor.kind === "markdown" &&
        state.documents[0].editor.document.relativePath
    ).toBe(newDocument.relativePath);
    expect(
      state.documents.some((document) =>
        editorIdEquals(
          document.id,
          createGlossaryEntryEditorId(oldGlossaryEntry.id, oldProjectContext)
        )
      )
    ).toBe(false);
  });

  it("keeps the reset state when a Project has no first document to load", () => {
    const state = resetOpenDocumentsForProjectContextSwitch(
      oldProjectScopedOpenDocuments()
    );

    expectOnlyUntitledEditor(state);
  });
});
