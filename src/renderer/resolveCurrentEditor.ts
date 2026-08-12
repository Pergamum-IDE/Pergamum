import type {
  PergamumProject,
  ProjectDocument
} from "../shared/api";
import type {
  ActiveProjectContext,
  EditorId
} from "../shared/editorId";
import type {
  GlossaryEntry,
  GlossaryEntryId
} from "../shared/glossary";
import type { EditorResolveResult } from "./editorNavigation";
import {
  createGlossaryEntryCurrentEditor,
  createMarkdownCurrentEditor,
  type CurrentEditor
} from "./currentEditor";
import type { CurrentDocument } from "./currentDocument";
import {
  findOpenDocument,
  type OpenDocumentsState
} from "./openDocuments";
import { findProjectDocumentByEditorId } from "./projectDocumentResolution";

export interface CurrentEditorResolverContext {
  readonly openDocumentsState: OpenDocumentsState;
  readonly project: PergamumProject | null;
  readonly activeProjectContext: ActiveProjectContext | null;
  readonly readProjectDocument: (
    document: ProjectDocument
  ) => Promise<CurrentDocument>;
  readonly getGlossaryEntryById: (
    entryId: GlossaryEntryId
  ) => Promise<GlossaryEntry | null>;
}

export async function resolveCurrentEditor(
  editorId: EditorId,
  context: CurrentEditorResolverContext
): Promise<EditorResolveResult<CurrentEditor>> {
  const openDocument = findOpenDocument(
    context.openDocumentsState,
    editorId
  );

  if (openDocument) {
    return {
      kind: "resolved",
      editor: openDocument.editor
    };
  }

  switch (editorId.kind) {
    case "projectDocument":
      return resolveProjectDocumentEditor(editorId, context);
    case "glossaryEntry":
      return resolveGlossaryEntryEditor(editorId, context);
    case "file":
    case "untitled":
      return { kind: "notFound" };
  }
}

async function resolveProjectDocumentEditor(
  editorId: EditorId,
  context: CurrentEditorResolverContext
): Promise<EditorResolveResult<CurrentEditor>> {
  if (
    editorId.kind !== "projectDocument" ||
    !context.project ||
    !context.activeProjectContext
  ) {
    return { kind: "notFound" };
  }

  const projectDocument = findProjectDocumentByEditorId(
    context.project,
    editorId,
    context.activeProjectContext
  );

  if (!projectDocument) {
    return { kind: "notFound" };
  }

  try {
    return {
      kind: "resolved",
      editor: createMarkdownCurrentEditor(
        await context.readProjectDocument(projectDocument)
      )
    };
  } catch (error) {
    return {
      kind: "unavailable",
      error
    };
  }
}

async function resolveGlossaryEntryEditor(
  editorId: EditorId,
  context: CurrentEditorResolverContext
): Promise<EditorResolveResult<CurrentEditor>> {
  if (
    editorId.kind !== "glossaryEntry" ||
    !context.project ||
    !context.activeProjectContext
  ) {
    return { kind: "notFound" };
  }

  try {
    const entry = await context.getGlossaryEntryById(editorId.entryId);

    return entry
      ? {
          kind: "resolved",
          editor: createGlossaryEntryCurrentEditor(entry)
        }
      : { kind: "notFound" };
  } catch (error) {
    return {
      kind: "unavailable",
      error
    };
  }
}
