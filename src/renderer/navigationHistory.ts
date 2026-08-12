import {
  editorIdEquals,
  type EditorId
} from "../shared/editorId";

export type NavigationDirection = "back" | "forward";

interface NavigationHistoryEntry {
  readonly key: number;
  readonly editorId: EditorId;
}

export interface NavigationHistoryCandidate {
  readonly key: number;
  readonly editorId: EditorId;
}

export interface NavigationHistorySnapshot {
  readonly entries: readonly EditorId[];
  readonly currentIndex: number;
}

export class NavigationHistory {
  private entries: NavigationHistoryEntry[] = [];
  private currentIndex = -1;
  private nextEntryKey = 1;

  record(editorId: EditorId): void {
    const currentEntry = this.currentEntry();

    if (currentEntry && editorIdEquals(currentEntry.editorId, editorId)) {
      return;
    }

    const retainedEntries =
      this.currentIndex >= 0
        ? this.entries.slice(0, this.currentIndex + 1)
        : [];

    this.entries = [
      ...retainedEntries,
      {
        key: this.nextEntryKey,
        editorId
      }
    ];
    this.nextEntryKey += 1;
    this.currentIndex = this.entries.length - 1;
  }

  reset(): void {
    this.entries = [];
    this.currentIndex = -1;
    this.nextEntryKey = 1;
  }

  current(): EditorId | null {
    return this.currentEntry()?.editorId ?? null;
  }

  candidate(direction: NavigationDirection): NavigationHistoryCandidate | null {
    const candidateIndex =
      direction === "back" ? this.currentIndex - 1 : this.currentIndex + 1;
    const candidate = this.entries[candidateIndex];

    return candidate
      ? {
          key: candidate.key,
          editorId: candidate.editorId
        }
      : null;
  }

  moveTo(candidate: NavigationHistoryCandidate): boolean {
    const nextIndex = this.entries.findIndex(
      (entry) => entry.key === candidate.key
    );

    if (nextIndex === -1) {
      return false;
    }

    this.currentIndex = nextIndex;
    return true;
  }

  invalidate(editorId: EditorId): void {
    const currentEntry = this.currentEntry();

    this.entries = this.entries.filter(
      (entry) => !editorIdEquals(entry.editorId, editorId)
    );

    if (this.entries.length === 0) {
      this.currentIndex = -1;
      return;
    }

    if (currentEntry && !editorIdEquals(currentEntry.editorId, editorId)) {
      this.currentIndex = this.entries.findIndex(
        (entry) => entry.key === currentEntry.key
      );
      return;
    }

    this.currentIndex = Math.min(this.currentIndex, this.entries.length - 1);
  }

  snapshot(): NavigationHistorySnapshot {
    return {
      entries: this.entries.map((entry) => entry.editorId),
      currentIndex: this.currentIndex
    };
  }

  private currentEntry(): NavigationHistoryEntry | null {
    return this.entries[this.currentIndex] ?? null;
  }
}
