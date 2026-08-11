import {
  createUntitledDocument,
  currentDocumentTitle,
  isCurrentDocumentDirty,
  isInitialUntitledDocument,
  type CurrentDocument
} from "./currentDocument";

export type FileOpenDocumentId = `file:${string}`;
export type ProjectOpenDocumentId = `project:${string}`;
export type UntitledOpenDocumentId = `untitled:${number}`;
export type OpenDocumentId =
  | FileOpenDocumentId
  | ProjectOpenDocumentId
  | UntitledOpenDocumentId;

export interface OpenDocument {
  id: OpenDocumentId;
  document: CurrentDocument;
}

export interface OpenDocumentsState {
  documents: OpenDocument[];
  activeDocumentId: OpenDocumentId;
  nextUntitledId: number;
}

export interface DocumentTab {
  id: OpenDocumentId;
  title: string;
  isDirty: boolean;
}

export interface ReplaceOpenDocumentResult {
  state: OpenDocumentsState;
  didCollide: boolean;
}

export function fileOpenDocumentId(filePath: string): FileOpenDocumentId {
  return `file:${filePath}`;
}

export function projectOpenDocumentId(
  relativePath: string
): ProjectOpenDocumentId {
  return `project:${relativePath}`;
}

function untitledOpenDocumentId(untitledId: number): UntitledOpenDocumentId {
  return `untitled:${untitledId}`;
}

function stableOpenDocumentId(
  document: CurrentDocument
): FileOpenDocumentId | ProjectOpenDocumentId | null {
  switch (document.kind) {
    case "file":
      return fileOpenDocumentId(document.path);
    case "project":
      return projectOpenDocumentId(document.relativePath);
    case "untitled":
      return null;
  }
}

export function createInitialOpenDocumentsState(): OpenDocumentsState {
  const untitledId = 1;
  const activeDocumentId = untitledOpenDocumentId(untitledId);

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
  document: CurrentDocument
): OpenDocumentsState {
  const stableId = stableOpenDocumentId(document);

  if (!stableId) {
    return createInitialOpenDocumentsState();
  }

  return {
    documents: [
      {
        id: stableId,
        document
      }
    ],
    activeDocumentId: stableId,
    nextUntitledId: 1
  };
}

export function activeOpenDocument(state: OpenDocumentsState): OpenDocument {
  const activeDocument = state.documents.find(
    (document) => document.id === state.activeDocumentId
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
  openDocumentId: OpenDocumentId
): boolean {
  return state.documents.some((document) => document.id === openDocumentId);
}

export function activateOpenDocument(
  state: OpenDocumentsState,
  openDocumentId: OpenDocumentId
): OpenDocumentsState {
  if (!hasOpenDocument(state, openDocumentId)) {
    return state;
  }

  return {
    ...state,
    activeDocumentId: openDocumentId
  };
}

export function openOrActivateDocument(
  state: OpenDocumentsState,
  document: CurrentDocument
): OpenDocumentsState {
  const stableId = stableOpenDocumentId(document);

  if (!stableId) {
    const activeDocumentId = untitledOpenDocumentId(state.nextUntitledId);

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
  openDocumentId: OpenDocumentId,
  updateDocument: (document: CurrentDocument) => CurrentDocument
): OpenDocumentsState {
  return {
    ...state,
    documents: state.documents.map((openDocument) =>
      openDocument.id === openDocumentId
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
  openDocumentId: OpenDocumentId,
  document: CurrentDocument
): ReplaceOpenDocumentResult {
  const existingIndex = state.documents.findIndex(
    (openDocument) => openDocument.id === openDocumentId
  );

  if (existingIndex === -1) {
    return {
      state,
      didCollide: false
    };
  }

  const nextId = stableOpenDocumentId(document) ?? openDocumentId;
  const didCollide =
    nextId !== openDocumentId && hasOpenDocument(state, nextId);

  if (didCollide) {
    return {
      state,
      didCollide
    };
  }

  const documents = state.documents.map((openDocument) =>
    openDocument.id === openDocumentId
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
        state.activeDocumentId === openDocumentId
          ? nextId
          : state.activeDocumentId
    },
    didCollide
  };
}
