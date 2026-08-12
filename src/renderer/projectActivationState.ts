import type { ActiveProjectContext } from "../shared/editorId";
import type { CurrentDocument } from "./currentDocument";
import {
  createInitialOpenDocumentsState,
  createOpenDocumentsStateWithDocument,
  type OpenDocumentsState
} from "./openDocuments";

export interface ProjectActivationToken {
  readonly projectActivationGeneration: number;
  readonly explicitEditorActivationGeneration: number;
}

export class ProjectActivationLifetime {
  private projectActivationGeneration = 0;
  private explicitEditorActivationGeneration = 0;

  startProjectContextSwitch(): ProjectActivationToken {
    this.projectActivationGeneration += 1;

    return {
      projectActivationGeneration: this.projectActivationGeneration,
      explicitEditorActivationGeneration:
        this.explicitEditorActivationGeneration
    };
  }

  markExplicitEditorActivation(): void {
    this.explicitEditorActivationGeneration += 1;
  }

  captureProjectActivationGeneration(): number {
    return this.projectActivationGeneration;
  }

  isProjectActivationCurrent(generation: number): boolean {
    return generation === this.projectActivationGeneration;
  }

  shouldApplyFirstProjectDocument(token: ProjectActivationToken): boolean {
    return (
      token.projectActivationGeneration ===
        this.projectActivationGeneration &&
      token.explicitEditorActivationGeneration ===
        this.explicitEditorActivationGeneration
    );
  }
}

export async function loadFirstProjectDocumentIfCurrent(
  lifetime: ProjectActivationLifetime,
  token: ProjectActivationToken,
  loadDocument: () => Promise<CurrentDocument>
): Promise<CurrentDocument | null> {
  try {
    const document = await loadDocument();

    return lifetime.shouldApplyFirstProjectDocument(token)
      ? document
      : null;
  } catch (error) {
    if (!lifetime.shouldApplyFirstProjectDocument(token)) {
      return null;
    }

    throw error;
  }
}

export function resetOpenDocumentsForProjectContextSwitch(
  state: OpenDocumentsState
): OpenDocumentsState {
  return createInitialOpenDocumentsState(state.nextUntitledId);
}

export function openFirstProjectDocumentAfterContextSwitch(
  state: OpenDocumentsState,
  document: CurrentDocument,
  activeProjectContext: ActiveProjectContext
): OpenDocumentsState {
  return createOpenDocumentsStateWithDocument(
    document,
    activeProjectContext,
    state.nextUntitledId
  );
}
