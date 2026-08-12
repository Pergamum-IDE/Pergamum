import {
  createUntitledDocument,
  currentDocumentTitle,
  isCurrentDocumentDirty,
  isInitialUntitledDocument,
  type CurrentDocument
} from "./currentDocument";
import {
  createEditorIdForPath,
  createProjectDocumentEditorId,
  createUntitledEditorId,
  editorIdEquals,
  type ActiveProjectContext,
  type EditorId
} from "../shared/editorId";

export interface OpenDocument {
  id: EditorId;
  document: CurrentDocument;
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

function stableOpenDocumentId(
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext | null
): EditorId | null {
  switch (document.kind) {
    case "file":
      return createEditorIdForPath(document.path, activeProjectContext);
    case "project":
      return createProjectDocumentEditorId(
        document.relativePath,
        activeProjectContext
      );
    case "untitled":
      return null;
  }
}

function isDocumentIdentityCompatible(
  document: CurrentDocument,
  editorId: EditorId
): boolean {
  switch (document.kind) {
    case "file":
      return editorId.kind === "file";
    case "project":
      return editorId.kind === "projectDocument";
    case "untitled":
      return editorId.kind === "untitled";
  }
}

function assertDocumentIdentityCompatible(
  document: CurrentDocument,
  editorId: EditorId
): void {
  if (!isDocumentIdentityCompatible(document, editorId)) {
    throw new Error("CurrentDocument kind does not match its EditorId.");
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
        document: createUntitledDocument()
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
  const stableId = stableOpenDocumentId(document, activeProjectContext);

  if (!stableId) {
    return createInitialOpenDocumentsState(nextUntitledId);
  }

  assertDocumentIdentityCompatible(document, stableId);

  return {
    documents: [
      {
        id: stableId,
        document
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

export function activeCurrentDocument(
  state: OpenDocumentsState
): CurrentDocument {
  return activeOpenDocument(state).document;
}

export function hasDirtyOpenDocuments(state: OpenDocumentsState): boolean {
  return state.documents.some((openDocument) =>
    isCurrentDocumentDirty(openDocument.document)
  );
}

export function isOnlyInitialUntitledDocument(
  state: OpenDocumentsState
): boolean {
  return (
    state.documents.length === 1 &&
    state.documents[0].document.kind === "untitled" &&
    isInitialUntitledDocument(state.documents[0].document)
  );
}

export function documentTabs(state: OpenDocumentsState): DocumentTab[] {
  return state.documents.map((openDocument) => ({
    id: openDocument.id,
    title: currentDocumentTitle(openDocument.document),
    isDirty: isCurrentDocumentDirty(openDocument.document)
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
  const stableId = stableOpenDocumentId(document, activeProjectContext);

  if (!stableId) {
    const activeDocumentId = createUntitledEditorId(state.nextUntitledId);

    return {
      documents: [
        ...state.documents,
        {
          id: activeDocumentId,
          document
        }
      ],
      activeDocumentId,
      nextUntitledId: state.nextUntitledId + 1
    };
  }

  assertDocumentIdentityCompatible(document, stableId);

  if (hasOpenDocument(state, stableId)) {
    return activateOpenDocument(state, stableId);
  }

  if (isOnlyInitialUntitledDocument(state)) {
    return {
      ...state,
      documents: [
        {
          id: stableId,
          document
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
        document
      }
    ],
    activeDocumentId: stableId
  };
}

export function updateOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId,
  updateDocument: (document: CurrentDocument) => CurrentDocument
): OpenDocumentsState {
  return {
    ...state,
    documents: state.documents.map((openDocument) =>
      editorIdEquals(openDocument.id, editorId)
        ? {
            ...openDocument,
            document: updateDocument(openDocument.document)
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

export function replaceOpenDocument(
  state: OpenDocumentsState,
  editorId: EditorId,
  document: CurrentDocument,
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
    stableOpenDocumentId(document, activeProjectContext) ?? editorId;
  assertDocumentIdentityCompatible(document, nextId);

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
          document
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
