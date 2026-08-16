import type {
  DebugLogDbEntityKind,
  DebugLogDbOperation,
  DebugLogReason
} from "../shared/debugLog";
import type { DebugLogger } from "./debugLogger";
import { sanitizeErrorForDebugLog } from "./debugLogSanitizer";

export type DbOperationLogger = Pick<DebugLogger, "log">;

export type DbOperationReason = Extract<
  DebugLogReason,
  | "validation_failed"
  | "context_stale"
  | "not_found"
  | "no_changes"
  | "database_unavailable"
  | "transaction_inactive"
  | "unknown"
>;

interface DbOperationDescriptor {
  readonly logger: DbOperationLogger;
  readonly dbOperation: DebugLogDbOperation;
  readonly dbEntityKind: DebugLogDbEntityKind;
  readonly now?: () => number;
}

interface DbOperationContext extends Required<DbOperationDescriptor> {
  readonly dbOperationId: string;
  readonly startedAt: number;
}

class DbOperationSkippedSignal extends Error {
  constructor(
    readonly reason: DbOperationReason,
    readonly thrownError: unknown
  ) {
    super("DB operation skipped");
    this.name = "DbOperationSkippedSignal";
  }
}

export interface DbOperationLogResult<T> {
  readonly value: T;
  readonly count?: number;
}

let nextDbOperationIndex = 0;

function nextDbOperationId(): string {
  nextDbOperationIndex += 1;
  return `dbOperation.${nextDbOperationIndex}`;
}

function nowMs(now: (() => number) | undefined): number {
  return now ? now() : Date.now();
}

function durationMs(context: DbOperationContext): number {
  return Math.max(0, context.now() - context.startedAt);
}

function countDetails(
  dbOperation: DebugLogDbOperation,
  count: number | undefined
): { readonly count?: number } {
  if (
    count === undefined ||
    dbOperation === "initialize" ||
    dbOperation === "transaction"
  ) {
    return {};
  }

  return { count };
}

function startDbOperationLog(input: DbOperationDescriptor): DbOperationContext {
  const now = input.now ?? Date.now;
  const context: DbOperationContext = {
    logger: input.logger,
    dbOperation: input.dbOperation,
    dbEntityKind: input.dbEntityKind,
    now,
    dbOperationId: nextDbOperationId(),
    startedAt: nowMs(now)
  };

  context.logger.log({
    level: "debug",
    event: "db.operation.started",
    details: {
      dbOperationId: context.dbOperationId,
      dbOperation: context.dbOperation,
      dbEntityKind: context.dbEntityKind
    }
  });

  return context;
}

function logDbOperationSucceeded(
  context: DbOperationContext,
  result: DbOperationLogResult<unknown>
): void {
  context.logger.log({
    level: "debug",
    event: "db.operation.succeeded",
    details: {
      dbOperationId: context.dbOperationId,
      dbOperation: context.dbOperation,
      dbEntityKind: context.dbEntityKind,
      result: "succeeded",
      durationMs: durationMs(context),
      ...countDetails(context.dbOperation, result.count)
    }
  });
}

function logDbOperationFailed(
  context: DbOperationContext,
  error: unknown
): void {
  context.logger.log({
    level: "error",
    event: "db.operation.failed",
    details: {
      dbOperationId: context.dbOperationId,
      dbOperation: context.dbOperation,
      dbEntityKind: context.dbEntityKind,
      result: "failed",
      durationMs: durationMs(context),
      error: sanitizeErrorForDebugLog(error)
    }
  });
}

function logDbOperationSkippedForContext(
  context: DbOperationContext,
  reason: DbOperationReason
): void {
  context.logger.log({
    level: "debug",
    event: "db.operation.skipped",
    details: {
      dbOperationId: context.dbOperationId,
      dbOperation: context.dbOperation,
      dbEntityKind: context.dbEntityKind,
      result: "ignored",
      reason,
      durationMs: durationMs(context)
    }
  });
}

export function dbOperationResult<T>(
  value: T,
  count?: number
): DbOperationLogResult<T> {
  return {
    value,
    ...(count !== undefined ? { count } : {})
  };
}

export async function withDbOperationLog<T>(
  input: DbOperationDescriptor,
  operation: () => Promise<DbOperationLogResult<T>>
): Promise<T> {
  const context = startDbOperationLog(input);

  try {
    const result = await operation();
    logDbOperationSucceeded(context, result);
    return result.value;
  } catch (error) {
    if (error instanceof DbOperationSkippedSignal) {
      logDbOperationSkippedForContext(context, error.reason);
      throw error.thrownError;
    }

    logDbOperationFailed(context, error);
    throw error;
  }
}

export function skipDbOperation(
  reason: DbOperationReason,
  thrownError: unknown
): never {
  throw new DbOperationSkippedSignal(reason, thrownError);
}

export function logDbOperationSkipped(
  input: DbOperationDescriptor & {
    readonly reason: DbOperationReason;
  }
): void {
  const now = input.now ?? Date.now;
  const startedAt = nowMs(now);

  input.logger.log({
    level: "debug",
    event: "db.operation.skipped",
    details: {
      dbOperationId: nextDbOperationId(),
      dbOperation: input.dbOperation,
      dbEntityKind: input.dbEntityKind,
      result: "ignored",
      reason: input.reason,
      durationMs: Math.max(0, now() - startedAt)
    }
  });
}
