import {
  createUntitledDocument,
  isInitialUntitledDocument,
  type CurrentDocument
} from "./currentDocument";
import {
  createUntitledEditorId,
  editorIdEquals,
  type ActiveProjectContext,
  type EditorId
} from "../shared/editorId";
import {
  createMarkdownCurrentEditor,
  currentEditorTitle,
  editorIdForCurrentEditor,
  isCurrentEditorDirty,
  isCurrentEditorIdentityCompatible,
  markdownDocumentForEditor,
  type CurrentEditor
} from "./currentEditor";

export interface OpenDocument {
  id: EditorId;
  editor: CurrentEditor;
}

export interface OpenDocumentsState {
  documents: OpenDocument[];
  activeDocumentId: EditorId;
  nextUntitledId: number;
}

export interface DocumentTab {
  id: EditorId;
  title: string;
  isDirty: boolean;
}

export interface ReplaceOpenDocumentResult {
  state: OpenDocumentsState;
  didCollide: boolean;
}

export function editorIdForCurrentDocument(
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext | null
): EditorId | null {
  return editorIdForCurrentEditor(
    createMarkdownCurrentEditor(document),
    activeProjectContext
  );
}

function assertEditorIdentityCompatible(
  editor: CurrentEditor,
  editorId: EditorId
): void {
  if (!isCurrentEditorIdentityCompatible(editor, editorId)) {
    throw new Error("CurrentEditor kind does not match its EditorId.");
  }
}

export function createInitialOpenDocumentsState(
  nextUntitledId = 1
): OpenDocumentsState {
  const untitledId = nextUntitledId;
  const activeDocumentId = createUntitledEditorId(untitledId);

  return {
    documents: [
      {
        id: activeDocumentId,
        editor: createMarkdownCurrentEditor(createUntitledDocument())
      }
    ],
    activeDocumentId,
    nextUntitledId: untitledId + 1
  };
}

export function createOpenDocumentsStateWithDocument(
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext | null,
  nextUntitledId = 1
): OpenDocumentsState {
  return createOpenDocumentsStateWithEditor(
    createMarkdownCurrentEditor(document),
    activeProjectContext,
    nextUntitledId
  );
}

export function createOpenDocumentsStateWithEditor(
  editor: CurrentEditor,
  activeProjectContext: ActiveProjectContext | null,
  nextUntitledId = 1
): OpenDocumentsState {
  const stableId = editorIdForCurrentEditor(
    editor,
    activeProjectContext
  );

  if (!stableId) {
    return createInitialOpenDocumentsState(nextUntitledId);
  }

  assertEditorIdentityCompatible(editor, stableId);

  return {
    documents: [
      {
        id: stableId,
        editor
      }
    ],
    activeDocumentId: stableId,
    nextUntitledId
  };
}

export function activeOpenDocument(state: OpenDocumentsState): OpenDocument {
  const activeDocument = state.documents.find(
    (document) => editorIdEquals(document.id, state.activeDocumentId)
  );

  return activeDocument ?? state.documents[0];
}

export function findOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId
): OpenDocument | null {
  return (
    state.documents.find((document) =>
      editorIdEquals(document.id, editorId)
    ) ?? null
  );
}

export function activeCurrentDocument(
  state: OpenDocumentsState
): CurrentDocument {
  const document = markdownDocumentForEditor(activeOpenDocument(state).editor);

  if (!document) {
    throw new Error("Active editor is not a Markdown document.");
  }

  return document;
}

export function activeCurrentEditor(
  state: OpenDocumentsState
): CurrentEditor {
  return activeOpenDocument(state).editor;
}

export function hasDirtyOpenDocuments(state: OpenDocumentsState): boolean {
  return state.documents.some((openDocument) =>
    isCurrentEditorDirty(openDocument.editor)
  );
}

export function isOnlyInitialUntitledDocument(
  state: OpenDocumentsState
): boolean {
  return (
    state.documents.length === 1 &&
    state.documents[0].editor.kind === "markdown" &&
    state.documents[0].editor.document.kind === "untitled" &&
    isInitialUntitledDocument(state.documents[0].editor.document)
  );
}

export function documentTabs(state: OpenDocumentsState): DocumentTab[] {
  return state.documents.map((openDocument) => ({
    id: openDocument.id,
    title: currentEditorTitle(openDocument.editor),
    isDirty: isCurrentEditorDirty(openDocument.editor)
  }));
}

export function hasOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId
): boolean {
  return state.documents.some((document) =>
    editorIdEquals(document.id, editorId)
  );
}

export function activateOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId
): OpenDocumentsState {
  if (!hasOpenDocument(state, editorId)) {
    return state;
  }

  return {
    ...state,
    activeDocumentId: editorId
  };
}

export function openOrActivateDocument(
  state: OpenDocumentsState,
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext | null
): OpenDocumentsState {
  return openOrActivateEditor(
    state,
    createMarkdownCurrentEditor(document),
    activeProjectContext
  );
}

export function openOrActivateEditor(
  state: OpenDocumentsState,
  editor: CurrentEditor,
  activeProjectContext: ActiveProjectContext | null
): OpenDocumentsState {
  const stableId = editorIdForCurrentEditor(
    editor,
    activeProjectContext
  );

  if (!stableId) {
    const activeDocumentId = createUntitledEditorId(state.nextUntitledId);

    return {
      documents: [
        ...state.documents,
        {
          id: activeDocumentId,
          editor
        }
      ],
      activeDocumentId,
      nextUntitledId: state.nextUntitledId + 1
    };
  }

  assertEditorIdentityCompatible(editor, stableId);

  if (hasOpenDocument(state, stableId)) {
    return activateOpenDocument(state, stableId);
  }

  if (isOnlyInitialUntitledDocument(state)) {
    return {
      ...state,
      documents: [
        {
          id: stableId,
          editor
        }
      ],
      activeDocumentId: stableId
    };
  }

  return {
    ...state,
    documents: [
      ...state.documents,
      {
        id: stableId,
        editor
      }
    ],
    activeDocumentId: stableId
  };
}

export function closeOpenEditor(
  state: OpenDocumentsState,
  editorId: EditorId
): OpenDocumentsState {
  const index = state.documents.findIndex((document) =>
    editorIdEquals(document.id, editorId)
  );

  if (index === -1) {
    return state;
  }

  const remainingDocuments = state.documents.filter(
    (_document, documentIndex) => documentIndex !== index
  );

  if (remainingDocuments.length === 0) {
    return createInitialOpenDocumentsState(state.nextUntitledId);
  }

  if (!editorIdEquals(state.activeDocumentId, editorId)) {
    return {
      ...state,
      documents: remainingDocuments
    };
  }

  const fallbackIndex = Math.min(index, remainingDocuments.length - 1);

  return {
    ...state,
    documents: remainingDocuments,
    activeDocumentId: remainingDocuments[fallbackIndex].id
  };
}

export function updateOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId,
  updateDocument: (document: CurrentDocument) => CurrentDocument
): OpenDocumentsState {
  return updateOpenEditor(state, editorId, (editor) => {
    const document = markdownDocumentForEditor(editor);

    return document
      ? createMarkdownCurrentEditor(updateDocument(document))
      : editor;
  });
}

export function updateOpenEditor(
  state: OpenDocumentsState,
  editorId: EditorId,
  updateEditor: (editor: CurrentEditor) => CurrentEditor
): OpenDocumentsState {
  return {
    ...state,
    documents: state.documents.map((openDocument) =>
      editorIdEquals(openDocument.id, editorId)
        ? {
            ...openDocument,
            editor: updateEditor(openDocument.editor)
          }
        : openDocument
    )
  };
}

export function updateActiveOpenDocument(
  state: OpenDocumentsState,
  updateDocument: (document: CurrentDocument) => CurrentDocument
): OpenDocumentsState {
  return updateOpenDocument(state, state.activeDocumentId, updateDocument);
}

export function updateActiveOpenEditor(
  state: OpenDocumentsState,
  updateEditor: (editor: CurrentEditor) => CurrentEditor
): OpenDocumentsState {
  return updateOpenEditor(state, state.activeDocumentId, updateEditor);
}

export function replaceOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId,
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext | null
): ReplaceOpenDocumentResult {
  return replaceOpenEditor(
    state,
    editorId,
    createMarkdownCurrentEditor(document),
    activeProjectContext
  );
}

export function replaceOpenEditor(
  state: OpenDocumentsState,
  editorId: EditorId,
  editor: CurrentEditor,
  activeProjectContext: ActiveProjectContext | null
): ReplaceOpenDocumentResult {
  const existingIndex = state.documents.findIndex(
    (openDocument) => editorIdEquals(openDocument.id, editorId)
  );

  if (existingIndex === -1) {
    return {
      state,
      didCollide: false
    };
  }

  const nextId =
    editorIdForCurrentEditor(editor, activeProjectContext) ?? editorId;
  assertEditorIdentityCompatible(editor, nextId);

  const didCollide =
    !editorIdEquals(nextId, editorId) && hasOpenDocument(state, nextId);

  if (didCollide) {
    return {
      state,
      didCollide
    };
  }

  const documents = state.documents.map((openDocument) =>
    editorIdEquals(openDocument.id, editorId)
      ? {
          id: nextId,
          editor
        }
      : openDocument
  );

  return {
    state: {
      ...state,
      documents,
      activeDocumentId:
        editorIdEquals(state.activeDocumentId, editorId)
          ? nextId
          : state.activeDocumentId
    },
    didCollide
  };
}
