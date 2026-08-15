import path from "node:path";
import {
  debugLogArchitectures,
  debugLogEditorIdKinds,
  debugLogEncodingAssumptions,
  debugLogExtensions,
  debugLogApplicationMenuTriggers,
  debugLogLineEndingKinds,
  debugLogOperations,
  debugLogPathKinds,
  debugLogPlatforms,
  debugLogReasons,
  debugLogResults,
  debugLogSaveTargetKinds,
  debugLogSizeBuckets,
  type DebugLogApplicationMenuTrigger,
  knownDebugLogCommandIds,
  knownDebugLogStatusKeys,
  type DebugLogArch,
  type DebugLogDetails,
  type DebugLogEditorIdKind,
  type DebugLogEncodingAssumption,
  type DebugLogErrorCategory,
  type DebugLogExtension,
  type DebugLogLineEndingKind,
  type DebugLogOperation,
  type DebugLogPathKind,
  type DebugLogPlatform,
  type DebugLogReason,
  type DebugLogResult,
  type DebugLogSaveTargetKind,
  type DebugLogSizeBucket,
  type SanitizedErrorInfo
} from "../shared/debugLog";

export interface DebugLogRuntimeDetails {
  appVersion: string;
  platform: DebugLogPlatform;
  arch: DebugLogArch;
  locale: string;
  electronVersion: string;
  nodeVersion: string;
  debugMode: boolean;
}

export interface DebugLogSanitizationContext {
  runtime: DebugLogRuntimeDetails;
  isKnownProjectRef(projectRef: string): boolean;
  isKnownDocumentRef(documentRef: string): boolean;
}

type MutableDebugLogDetails = {
  -readonly [TKey in keyof DebugLogDetails]: DebugLogDetails[TKey];
};

const safeIdentifierPattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const safeCodePattern = /^[A-Za-z0-9_.-]{1,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includesValue<TValue extends string>(
  catalog: readonly TValue[],
  value: unknown
): value is TValue {
  return typeof value === "string" && catalog.includes(value as TValue);
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  return value.length <= maxLength ? value : undefined;
}

function sanitizeSafeIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && safeIdentifierPattern.test(value)
    ? value
    : undefined;
}

function sanitizeSafeCode(value: unknown): string | undefined {
  return typeof value === "string" && safeCodePattern.test(value)
    ? value
    : undefined;
}

function sanitizeNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isSafeInteger(value)
    ? value
    : undefined;
}

function sanitizeNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function enumOrUnknown<TValue extends string>(
  catalog: readonly TValue[],
  value: unknown
): TValue {
  return includesValue(catalog, value)
    ? value
    : (catalog[catalog.length - 1] as TValue);
}

function sanitizeCommandId(value: unknown): string {
  return includesValue(knownDebugLogCommandIds, value) ? value : "unknown";
}

function sanitizeStatusKey(value: unknown): string {
  return includesValue(knownDebugLogStatusKeys, value) ? value : "unknown";
}

function errorCodeFromValue(value: unknown): string | undefined {
  if (isRecord(value) && "code" in value) {
    return sanitizeSafeCode(value.code);
  }

  return undefined;
}

function errorNameFromValue(value: unknown): string | undefined {
  if (value instanceof Error) {
    return sanitizeSafeIdentifier(value.name);
  }

  if (isRecord(value) && "name" in value) {
    return sanitizeSafeIdentifier(value.name);
  }

  return undefined;
}

function categoryFromSanitizedInfo(value: unknown): DebugLogErrorCategory | null {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.category) {
    case "notFound":
    case "permissionDenied":
    case "io":
    case "database":
    case "validation":
    case "unknown":
      return value.category;
    default:
      return null;
  }
}

function categoryFromCodeOrName(
  code: string | undefined,
  name: string | undefined
): DebugLogErrorCategory {
  if (
    code === "ENOENT" ||
    code === "MODULE_NOT_FOUND" ||
    code?.endsWith("_NOT_FOUND")
  ) {
    return "notFound";
  }

  if (code === "EACCES" || code === "EPERM") {
    return "permissionDenied";
  }

  if (
    code?.startsWith("SQLITE") ||
    code?.startsWith("PROJECT_DATABASE") ||
    name === "ProjectDatabaseError"
  ) {
    return "database";
  }

  if (
    code === "EINVAL" ||
    code?.includes("VALIDATION") ||
    name === "TypeError" ||
    name === "RangeError" ||
    name === "SyntaxError" ||
    name?.startsWith("Invalid")
  ) {
    return "validation";
  }

  if (
    code === "EIO" ||
    code === "EBUSY" ||
    code === "EMFILE" ||
    code === "ENFILE" ||
    code === "ENOSPC" ||
    code === "EISDIR" ||
    code === "ENOTDIR"
  ) {
    return "io";
  }

  return "unknown";
}

export function sanitizeErrorForDebugLog(error: unknown): SanitizedErrorInfo {
  const name = errorNameFromValue(error);
  const code = errorCodeFromValue(error);
  const explicitCategory = categoryFromSanitizedInfo(error);
  const sanitized: SanitizedErrorInfo = {
    category: explicitCategory ?? categoryFromCodeOrName(code, name)
  };

  if (name) {
    sanitized.name = name;
  }

  if (code) {
    sanitized.code = code;
  }

  return sanitized;
}

export function sanitizeDebugLogDetails(
  details: unknown,
  context: DebugLogSanitizationContext
): DebugLogDetails | undefined {
  if (!isRecord(details)) {
    return undefined;
  }

  const sanitized: MutableDebugLogDetails = {};
  let droppedKeyCount = 0;

  for (const [key, value] of Object.entries(details)) {
    switch (key) {
      case "appVersion":
        sanitized.appVersion = context.runtime.appVersion;
        break;
      case "platform":
        sanitized.platform = context.runtime.platform;
        break;
      case "arch":
        sanitized.arch = context.runtime.arch;
        break;
      case "locale":
        sanitized.locale = context.runtime.locale;
        break;
      case "electronVersion":
        sanitized.electronVersion = context.runtime.electronVersion;
        break;
      case "nodeVersion":
        sanitized.nodeVersion = context.runtime.nodeVersion;
        break;
      case "debugMode":
        sanitized.debugMode = context.runtime.debugMode;
        break;
      case "commandId":
        sanitized.commandId = sanitizeCommandId(value);
        break;
      case "editorIdKind":
        sanitized.editorIdKind = enumOrUnknown<DebugLogEditorIdKind>(
          debugLogEditorIdKinds,
          value
        );
        break;
      case "operation":
        sanitized.operation = enumOrUnknown<DebugLogOperation>(
          debugLogOperations,
          value
        );
        break;
      case "result":
        sanitized.result = enumOrUnknown<DebugLogResult>(
          debugLogResults,
          value
        );
        break;
      case "reason":
        sanitized.reason = enumOrUnknown<DebugLogReason>(
          debugLogReasons,
          value
        );
        break;
      case "trigger":
        sanitized.trigger = enumOrUnknown<DebugLogApplicationMenuTrigger>(
          debugLogApplicationMenuTriggers,
          value
        );
        break;
      case "statusKey":
        sanitized.statusKey = sanitizeStatusKey(value);
        break;
      case "hasPendingSave": {
        const hasPendingSave = sanitizeBoolean(value);

        if (hasPendingSave !== undefined) {
          sanitized.hasPendingSave = hasPendingSave;
        }
        break;
      }
      case "hasScheduledSave": {
        const hasScheduledSave = sanitizeBoolean(value);

        if (hasScheduledSave !== undefined) {
          sanitized.hasScheduledSave = hasScheduledSave;
        }
        break;
      }
      case "isComposing": {
        const isComposing = sanitizeBoolean(value);

        if (isComposing !== undefined) {
          sanitized.isComposing = isComposing;
        }
        break;
      }
      case "isDirty": {
        const isDirty = sanitizeBoolean(value);

        if (isDirty !== undefined) {
          sanitized.isDirty = isDirty;
        }
        break;
      }
      case "canSave": {
        const canSave = sanitizeBoolean(value);

        if (canSave !== undefined) {
          sanitized.canSave = canSave;
        }
        break;
      }
      case "hasRelatedTarget": {
        const hasRelatedTarget = sanitizeBoolean(value);

        if (hasRelatedTarget !== undefined) {
          sanitized.hasRelatedTarget = hasRelatedTarget;
        }
        break;
      }
      case "nextTargetInsideAppShell": {
        const nextTargetInsideAppShell = sanitizeBoolean(value);

        if (nextTargetInsideAppShell !== undefined) {
          sanitized.nextTargetInsideAppShell = nextTargetInsideAppShell;
        }
        break;
      }
      case "documentHasFocus": {
        const documentHasFocus = sanitizeBoolean(value);

        if (documentHasFocus !== undefined) {
          sanitized.documentHasFocus = documentHasFocus;
        }
        break;
      }
      case "willClearPendingSave": {
        const willClearPendingSave = sanitizeBoolean(value);

        if (willClearPendingSave !== undefined) {
          sanitized.willClearPendingSave = willClearPendingSave;
        }
        break;
      }
      case "saveTargetKind":
        sanitized.saveTargetKind = enumOrUnknown<DebugLogSaveTargetKind>(
          debugLogSaveTargetKinds,
          value
        );
        break;
      case "projectRef":
        if (typeof value === "string" && context.isKnownProjectRef(value)) {
          sanitized.projectRef = value;
        } else {
          droppedKeyCount += 1;
        }
        break;
      case "documentRef":
        if (typeof value === "string" && context.isKnownDocumentRef(value)) {
          sanitized.documentRef = value;
        } else {
          droppedKeyCount += 1;
        }
        break;
      case "pathKind":
        sanitized.pathKind = enumOrUnknown<DebugLogPathKind>(
          debugLogPathKinds,
          value
        );
        break;
      case "extension":
        sanitized.extension = enumOrUnknown<DebugLogExtension>(
          debugLogExtensions,
          value
        );
        break;
      case "pathDepth": {
        const pathDepth = sanitizeNonNegativeInteger(value);

        if (pathDepth !== undefined) {
          sanitized.pathDepth = pathDepth;
        }
        break;
      }
      case "sizeBucket":
        sanitized.sizeBucket = enumOrUnknown<DebugLogSizeBucket>(
          debugLogSizeBuckets,
          value
        );
        break;
      case "lineCount": {
        const lineCount = sanitizeNonNegativeInteger(value);

        if (lineCount !== undefined) {
          sanitized.lineCount = lineCount;
        }
        break;
      }
      case "lineEndingKind":
        sanitized.lineEndingKind = enumOrUnknown<DebugLogLineEndingKind>(
          debugLogLineEndingKinds,
          value
        );
        break;
      case "encodingAssumption":
        sanitized.encodingAssumption =
          enumOrUnknown<DebugLogEncodingAssumption>(
            debugLogEncodingAssumptions,
            value
          );
        break;
      case "durationMs": {
        const durationMs = sanitizeNonNegativeNumber(value);

        if (durationMs !== undefined) {
          sanitized.durationMs = durationMs;
        }
        break;
      }
      case "preSinkQueuedEventCount": {
        const preSinkQueuedEventCount = sanitizeNonNegativeInteger(value);

        if (preSinkQueuedEventCount !== undefined) {
          sanitized.preSinkQueuedEventCount = preSinkQueuedEventCount;
        }
        break;
      }
      case "droppedEventCount": {
        const droppedEventCount = sanitizeNonNegativeInteger(value);

        if (droppedEventCount !== undefined) {
          sanitized.droppedEventCount = droppedEventCount;
        }
        break;
      }
      case "droppedKeyCount":
        break;
      case "rotated":
        if (typeof value === "boolean") {
          sanitized.rotated = value;
        }
        break;
      case "error":
        sanitized.error = sanitizeErrorForDebugLog(value);
        break;
      default:
        droppedKeyCount += 1;
        break;
    }
  }

  if (droppedKeyCount > 0) {
    sanitized.droppedKeyCount = droppedKeyCount;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function debugLogExtensionForPath(filePath: string): DebugLogExtension {
  const extension = path.extname(filePath).toLowerCase();

  if (!extension) {
    return "none";
  }

  return includesValue(debugLogExtensions, extension) ? extension : "unknown";
}

export function debugLogPathDepth(filePath: string): number {
  return filePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0).length;
}

export function debugLogLineEndingKind(
  content: string
): DebugLogDetails["lineEndingKind"] {
  const hasCrLf = /\r\n/.test(content);
  const withoutCrLf = content.replace(/\r\n/g, "");
  const hasLf = /\n/.test(withoutCrLf);
  const hasCr = /\r/.test(withoutCrLf);

  if ((hasCrLf && (hasLf || hasCr)) || (hasLf && hasCr)) {
    return "mixed";
  }

  if (hasCrLf) {
    return "crlf";
  }

  if (hasLf) {
    return "lf";
  }

  if (hasCr) {
    return "cr";
  }

  return "unknown";
}

export function debugLogLineCount(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  return content.split(/\r\n|\r|\n/).length;
}

export function debugLogSizeBucket(byteLength: number): DebugLogSizeBucket {
  if (byteLength === 0) {
    return "empty";
  }

  if (byteLength < 32 * 1024) {
    return "small";
  }

  if (byteLength < 512 * 1024) {
    return "medium";
  }

  if (byteLength < 5 * 1024 * 1024) {
    return "large";
  }

  return "huge";
}
