export type EditorSaveState =
  | "clean"
  | "dirty"
  | "saving"
  | "saveFailed";

export type EditorSyncState =
  | "fresh"
  | "stale"
  | "deleted";

export function isEditorConflicted(
  saveState: EditorSaveState,
  syncState: EditorSyncState
): boolean {
  return saveState === "dirty" && syncState === "stale";
}
