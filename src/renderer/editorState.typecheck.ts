import type {
  EditorSaveState,
  EditorSyncState
} from "./editorState";

const cleanSaveState: EditorSaveState = "clean";
const dirtySaveState: EditorSaveState = "dirty";
const savingSaveState: EditorSaveState = "saving";
const saveFailedSaveState: EditorSaveState = "saveFailed";

const freshSyncState: EditorSyncState = "fresh";
const staleSyncState: EditorSyncState = "stale";
const deletedSyncState: EditorSyncState = "deleted";

type ReadOnlyEditorWithoutStateAxes = {
  readonly kind: "searchResult";
  readonly query: string;
};

const readOnlyEditorWithoutStateAxes: ReadOnlyEditorWithoutStateAxes = {
  kind: "searchResult",
  query: "dragon"
};

// @ts-expect-error Conflict is derived from dirty + stale, not a save state.
const conflictedSaveState: EditorSaveState = "conflicted";

// @ts-expect-error Conflict is derived from dirty + stale, not a sync state.
const conflictedSyncState: EditorSyncState = "conflicted";

void cleanSaveState;
void dirtySaveState;
void savingSaveState;
void saveFailedSaveState;
void freshSyncState;
void staleSyncState;
void deletedSyncState;
void readOnlyEditorWithoutStateAxes;
void conflictedSaveState;
void conflictedSyncState;
