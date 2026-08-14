import type {
  DebugLogEventName,
  DebugLogLevel,
  RendererDebugLogRequest
} from "../shared/debugLog";

const safeIdentifierPattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const safeCodePattern = /^[A-Za-z0-9_.-]{1,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && safeIdentifierPattern.test(value)
    ? value
    : undefined;
}

function safeCode(value: unknown): string | undefined {
  return typeof value === "string" && safeCodePattern.test(value)
    ? value
    : undefined;
}

export function rendererDebugErrorInfo(error: unknown): Record<string, unknown> {
  const info: Record<string, unknown> = {};

  if (error instanceof Error) {
    const name = safeIdentifier(error.name);

    if (name) {
      info.name = name;
    }
  }

  if (isRecord(error) && "code" in error) {
    const code = safeCode(error.code);

    if (code) {
      info.code = code;
    }
  }

  return info;
}

export function logRendererDebugEvent(input: {
  level: DebugLogLevel;
  event: DebugLogEventName;
  details?: Record<string, unknown>;
}): void {
  const request: RendererDebugLogRequest = {
    level: input.level,
    event: input.event,
    ...(input.details ? { details: input.details } : {})
  };

  void window.pergamum.debugLog.logEvent(request).catch(() => undefined);
}

