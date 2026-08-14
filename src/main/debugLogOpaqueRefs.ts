function formatOpaqueRefIndex(index: number): string {
  return String(index).padStart(3, "0");
}

export class DebugLogOpaqueRefRegistry {
  private readonly projectRefsByKey = new Map<string, string>();
  private readonly documentRefsByKey = new Map<string, string>();
  private readonly knownProjectRefs = new Set<string>();
  private readonly knownDocumentRefs = new Set<string>();
  private nextProjectRefIndex = 1;
  private nextDocumentRefIndex = 1;

  projectRefForKey(key: string): string {
    const existingRef = this.projectRefsByKey.get(key);

    if (existingRef) {
      return existingRef;
    }

    const projectRef = `project:session:${formatOpaqueRefIndex(
      this.nextProjectRefIndex
    )}`;
    this.nextProjectRefIndex += 1;
    this.projectRefsByKey.set(key, projectRef);
    this.knownProjectRefs.add(projectRef);
    return projectRef;
  }

  documentRefForKey(key: string): string {
    const existingRef = this.documentRefsByKey.get(key);

    if (existingRef) {
      return existingRef;
    }

    const documentRef = `document:session:${formatOpaqueRefIndex(
      this.nextDocumentRefIndex
    )}`;
    this.nextDocumentRefIndex += 1;
    this.documentRefsByKey.set(key, documentRef);
    this.knownDocumentRefs.add(documentRef);
    return documentRef;
  }

  isKnownProjectRef(projectRef: string): boolean {
    return this.knownProjectRefs.has(projectRef);
  }

  isKnownDocumentRef(documentRef: string): boolean {
    return this.knownDocumentRefs.has(documentRef);
  }
}

