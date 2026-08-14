export const debugLogLevels = ["debug", "info", "warn", "error"] as const;

export type DebugLogLevel = (typeof debugLogLevels)[number];

export const debugLogEventNames = [
  "app.start",
  "log.file.opened",
  "log.file.write.failed",
  "project.open.succeeded",
  "project.open.failed",
  "command.invoked",
  "command.failed",
  "document.open.failed",
  "document.save.failed",
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
  "unknown"
] as const;

export type DebugLogOperation = (typeof debugLogOperations)[number];

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
  operation?: DebugLogOperation;
  result?: DebugLogResult;
  statusKey?: string;

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

export interface RendererDebugLogRequest {
  level: DebugLogLevel | string;
  event: DebugLogEventName | string;
  details?: Record<string, unknown>;
}

export const knownDebugLogCommandIds = [
  "workspace.files.focus",
  "workspace.search.focus",
  "workspace.glossary.focus",
  "workspace.settings.toggle",
  "workbench.utilityWindow.open",
  "workbench.utilityWindow.close",
  "workbench.utilityWindow.toggle",
  "glossary.entry.open",
  "glossary.entry.create",
  "glossary.entry.previousOccurrence",
  "glossary.entry.nextOccurrence",
  "glossary.occurrences.previous",
  "glossary.occurrences.next",
  "glossary.occurrences.openEntry",
  "glossary.occurrences.closeTracking"
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

