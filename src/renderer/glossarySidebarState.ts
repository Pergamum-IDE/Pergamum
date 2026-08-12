import type {
  GlossaryEntry,
  GlossaryEntryId
} from "../shared/glossary";

export type GlossarySidebarStatus =
  | "noProject"
  | "loading"
  | "loaded"
  | "error";

export interface GlossarySidebarState {
  status: GlossarySidebarStatus;
  entries: GlossaryEntry[];
  selectedEntryId: GlossaryEntryId | null;
}

export function createNoProjectGlossarySidebarState(): GlossarySidebarState {
  return {
    status: "noProject",
    entries: [],
    selectedEntryId: null
  };
}

export function createLoadingGlossarySidebarState(
  selectedEntryId: GlossaryEntryId | null
): GlossarySidebarState {
  return {
    status: "loading",
    entries: [],
    selectedEntryId
  };
}

export function createLoadedGlossarySidebarState(
  entries: GlossaryEntry[],
  selectedEntryId: GlossaryEntryId | null
): GlossarySidebarState {
  return {
    status: "loaded",
    entries,
    selectedEntryId: preserveGlossarySelection(entries, selectedEntryId)
  };
}

export function createErrorGlossarySidebarState(
  selectedEntryId: GlossaryEntryId | null
): GlossarySidebarState {
  return {
    status: "error",
    entries: [],
    selectedEntryId
  };
}

export function canonicalGlossarySurface(entry: GlossaryEntry): string {
  const canonicalForm = entry.forms.find(
    (form) => form.isCanonical === true
  );

  return canonicalForm?.surface ?? entry.id;
}

export function preserveGlossarySelection(
  entries: GlossaryEntry[],
  selectedEntryId: GlossaryEntryId | null
): GlossaryEntryId | null {
  if (!selectedEntryId) {
    return null;
  }

  return entries.some((entry) => entry.id === selectedEntryId)
    ? selectedEntryId
    : null;
}

export function shouldApplyGlossaryLoadResult(
  currentRequestId: number,
  requestId: number
): boolean {
  return currentRequestId === requestId;
}

export async function loadGlossaryEntries(): Promise<GlossaryEntry[]> {
  return window.pergamum.glossary.list();
}
