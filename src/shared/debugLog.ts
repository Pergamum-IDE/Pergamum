import {
  applicationCommandIds,
  editCommandIds,
  editorCommandIds
} from "./commandIds";
import {
  contextMenuSurfaces,
  type ContextMenuSurface
} from "./editContextMenu";

export const debugLogLevels = ["debug", "info", "warn", "error"] as const;

export type DebugLogLevel = (typeof debugLogLevels)[number];

export const DEFAULT_DEBUG_LOG_UI_BUFFER_LIMIT = 1_000;
export const DEBUG_LOG_GAP_RECOVERY_LIMIT = 3;

export const debugLogEventNames = [
  "app.start",
  "log.file.opened",
  "log.file.write.failed",
  "project.open.succeeded",
  "project.open.failed",
  "application_menu.command.sent",
  "application_menu.command.received",
  "command.invoked",
  "command.failed",
  "document.open.failed",
  "document.save.failed",
  "ime.composition.started",
  "ime.composition.ended",
  "ime.command.passed_through",
  "ime.command.ignored",
  "ime.save.pending.created",
  "ime.save.pending.scheduled",
  "ime.save.pending.executed",
  "ime.save.pending.cleared",
  "ime.focus.checked",
  "contextMenu.requested",
  "contextMenu.opened",
  "contextMenu.suppressed",
  "contextMenu.command.selected",
  "edit.command.requested",
  "edit.command.delegated",
  "edit.command.ignored",
  "edit.command.failed",
  "db.operation.started",
  "db.operation.succeeded",
  "db.operation.failed",
  "db.operation.skipped",
  "save.requested",
  "save.in_flight.ignored",
  "save.started",
  "save.skipped",
  "save.succeeded",
  "save.failed",
  "glossary.occurrences.scan.failed",
  "app.uncaughtException",
  "app.unhandledRejection"
] as const;

export type DebugLogEventName = (typeof debugLogEventNames)[number];

export const debugLogPlatforms = [
  "win32",
  "darwin",
  "linux",
  "unknown"
] as const;

export type DebugLogPlatform = (typeof debugLogPlatforms)[number];

export const debugLogArchitectures = [
  "x64",
  "arm64",
  "ia32",
  "unknown"
] as const;

export type DebugLogArch = (typeof debugLogArchitectures)[number];

export const debugLogOperations = [
  "open",
  "save",
  "close",
  "scan",
  "create",
  "update",
  "delete",
  "navigate",
  "initialize",
  "command",
  "unknown"
] as const;

export type DebugLogOperation = (typeof debugLogOperations)[number];

export const debugLogDbOperations = [
  "create",
  "read",
  "update",
  "delete",
  "upsert",
  "list",
  "count",
  "initialize",
  "transaction"
] as const;

export type DebugLogDbOperation = (typeof debugLogDbOperations)[number];

export const debugLogDbEntityKinds = [
  "glossaryEntry",
  "glossaryForm",
  "database",
  "unknown"
] as const;

export type DebugLogDbEntityKind = (typeof debugLogDbEntityKinds)[number];

export const debugLogResults = [
  "succeeded",
  "failed",
  "cancelled",
  "ignored",
  "unknown"
] as const;

export type DebugLogResult = (typeof debugLogResults)[number];

export const debugLogEditorIdKinds = [
  "file",
  "untitled",
  "projectDocument",
  "glossaryEntry",
  "unknown"
] as const;

export type DebugLogEditorIdKind = (typeof debugLogEditorIdKinds)[number];

export const debugLogReasons = [
  "validation_failed",
  "context_stale",
  "not_found",
  "no_changes",
  "database_unavailable",
  "transaction_inactive",
  "invalid_command",
  "window_unavailable",
  "web_contents_destroyed",
  "native_delegation_unavailable",
  "focus_left_app_shell",
  "active_editor_changed",
  "project_context_changed",
  "unmount",
  "composition_restarted",
  "manual_clear",
  "unsupported_surface",
  "disabled_command",
  "unsupported_editor",
  "glossary_not_dirty",
  "glossary_already_saving",
  "standalone_save_canceled",
  "no_save_target",
  "unknown"
] as const;

export type DebugLogReason = (typeof debugLogReasons)[number];

export const debugLogApplicationMenuTriggers = [
  "menu",
  "accelerator",
  "unknown"
] as const;

export type DebugLogApplicationMenuTrigger =
  (typeof debugLogApplicationMenuTriggers)[number];

export const debugLogSaveTargetKinds = [
  "projectDocument",
  "standaloneMarkdown",
  "glossaryEntry",
  "unsupported",
  "unknown"
] as const;

export type DebugLogSaveTargetKind =
  (typeof debugLogSaveTargetKinds)[number];

export const debugLogPathKinds = [
  "projectFile",
  "appData",
  "logsDir",
  "unknown"
] as const;

export type DebugLogPathKind = (typeof debugLogPathKinds)[number];

export const debugLogExtensions = [
  ".md",
  ".markdown",
  ".txt",
  "none",
  "unknown"
] as const;

export type DebugLogExtension = (typeof debugLogExtensions)[number];

export const debugLogSizeBuckets = [
  "empty",
  "small",
  "medium",
  "large",
  "huge",
  "unknown"
] as const;

export type DebugLogSizeBucket = (typeof debugLogSizeBuckets)[number];

export const debugLogLineEndingKinds = [
  "lf",
  "crlf",
  "cr",
  "mixed",
  "unknown"
] as const;

export type DebugLogLineEndingKind = (typeof debugLogLineEndingKinds)[number];

export const debugLogEncodingAssumptions = ["utf8", "unknown"] as const;

export type DebugLogEncodingAssumption =
  (typeof debugLogEncodingAssumptions)[number];

export type DebugLogErrorCategory =
  | "notFound"
  | "permissionDenied"
  | "io"
  | "database"
  | "validation"
  | "unknown";

export interface SanitizedErrorInfo {
  name?: string;
  code?: string;
  category: DebugLogErrorCategory;
}

export interface DebugLogDetails {
  appVersion?: string;
  platform?: DebugLogPlatform;
  arch?: DebugLogArch;
  locale?: string;
  electronVersion?: string;
  nodeVersion?: string;
  debugMode?: boolean;

  commandId?: string;
  editorIdKind?: DebugLogEditorIdKind;
  interactionId?: string;
  requestedSurface?: ContextMenuSurface;
  delegatedSurface?: ContextMenuSurface;
  hasSelection?: boolean;
  operation?: DebugLogOperation;
  dbOperationId?: string;
  dbOperation?: DebugLogDbOperation;
  dbEntityKind?: DebugLogDbEntityKind;
  result?: DebugLogResult;
  reason?: DebugLogReason;
  trigger?: DebugLogApplicationMenuTrigger;
  statusKey?: string;

  hasPendingSave?: boolean;
  hasScheduledSave?: boolean;
  isComposing?: boolean;
  isDirty?: boolean;
  canSave?: boolean;
  hasRelatedTarget?: boolean;
  nextTargetInsideAppShell?: boolean;
  documentHasFocus?: boolean;
  willClearPendingSave?: boolean;

  saveTargetKind?: DebugLogSaveTargetKind;

  projectRef?: string;
  documentRef?: string;

  pathKind?: DebugLogPathKind;
  extension?: DebugLogExtension;
  pathDepth?: number;
  sizeBucket?: DebugLogSizeBucket;
  lineCount?: number;
  lineEndingKind?: DebugLogLineEndingKind;
  encodingAssumption?: DebugLogEncodingAssumption;

  durationMs?: number;
  count?: number;

  preSinkQueuedEventCount?: number;
  droppedEventCount?: number;
  droppedKeyCount?: number;
  rotated?: boolean;

  error?: SanitizedErrorInfo;
}

export interface DebugLogEvent {
  seq: number;
  timestamp: string;
  level: DebugLogLevel;
  event: DebugLogEventName;
  sessionId: string;
  details?: DebugLogDetails;
}

export interface SanitizedDebugLogEvent {
  seq: number;
  timestamp: string;
  level: DebugLogLevel;
  event: DebugLogEventName;
  details?: DebugLogDetails;
}

export interface DebugLogSnapshot {
  enabled: boolean;
  sessionId: string | null;
  events: SanitizedDebugLogEvent[];
  uiDroppedEventCount: number;
  uiBufferLimit: number;
}

export interface RendererDebugLogRequest {
  level: DebugLogLevel | string;
  event: DebugLogEventName | string;
  details?: Record<string, unknown>;
}

export const knownDebugLogCommandIds = [
  applicationCommandIds.openProject,
  editorCommandIds.openMarkdownDocument,
  editorCommandIds.saveDocument,
  applicationCommandIds.toggleRecentProjects,
  ...editCommandIds,
  "workspace.files.focus",
  "workspace.search.focus",
  "workspace.glossary.focus",
  "workspace.settings.toggle",
  "workbench.utilityWindow.open",
  "workbench.utilityWindow.close",
  "workbench.utilityWindow.toggle",
  "glossary.entry.open",
  "glossary.entry.create",
  "glossary.entry.occurrences.previous",
  "glossary.entry.occurrences.next",
  "glossary.occurrences.previous",
  "glossary.occurrences.next",
  "glossary.occurrences.entry.open",
  "glossary.occurrences.tracking.close"
] as const;

export const knownDebugLogStatusKeys = [
  "unknown",
  "app.ready",
  "status.commandFailed",
  "status.documentOpenFailed",
  "status.glossaryOccurrenceEntryNotFound",
  "status.glossaryOccurrenceNoActiveDocument",
  "status.glossaryOccurrenceNotFound",
  "status.openCanceled",
  "status.openedFile",
  "status.openedProject",
  "status.openedProjectDocument",
  "status.openedProjectDocumentOnly",
  "status.openProjectCanceled",
  "status.projectDocumentNotFound",
  "status.projectOpenFailed",
  "status.recentProjectOpenFailed",
  "status.saveAsTargetAlreadyOpen",
  "status.saveCanceled",
  "status.saveFailed",
  "status.savedPath",
  "status.settingsReloadFailed",
  "status.settingsSaveFailed",
  "status.settingsSaved",
  "status.withDetail"
] as const;

function includesValue<TValue extends string>(
  catalog: readonly TValue[],
  value: unknown
): value is TValue {
  return typeof value === "string" && catalog.includes(value as TValue);
}

export function isDebugLogLevel(value: unknown): value is DebugLogLevel {
  return includesValue(debugLogLevels, value);
}

export function isDebugLogEventName(value: unknown): value is DebugLogEventName {
  return includesValue(debugLogEventNames, value);
}

export function isDebugLogContextMenuSurface(
  value: unknown
): value is ContextMenuSurface {
  return includesValue(contextMenuSurfaces, value);
}
