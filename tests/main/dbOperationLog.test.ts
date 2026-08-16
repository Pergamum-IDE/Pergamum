import { describe, expect, it, vi } from "vitest";
import {
  dbOperationResult,
  logDbOperationSkipped,
  withDbOperationLog
} from "../../src/main/dbOperationLog";

describe("DB operation debug logging helper", () => {
  it("emits started and succeeded with the same opaque operation ID", async () => {
    const logger = { log: vi.fn() };
    const now = sequenceNow([100, 125]);

    await expect(
      withDbOperationLog(
        {
          logger,
          dbOperation: "read",
          dbEntityKind: "glossaryEntry",
          now
        },
        async () => dbOperationResult("result", 0)
      )
    ).resolves.toBe("result");

    expect(logger.log.mock.calls.map((call) => call[0].event)).toEqual([
      "db.operation.started",
      "db.operation.succeeded"
    ]);

    const started = logger.log.mock.calls[0][0];
    const succeeded = logger.log.mock.calls[1][0];

    expect(started.details?.dbOperationId).toBe(
      succeeded.details?.dbOperationId
    );
    expect(succeeded).toMatchObject({
      level: "debug",
      event: "db.operation.succeeded",
      details: {
        dbOperation: "read",
        dbEntityKind: "glossaryEntry",
        result: "succeeded",
        durationMs: 25,
        count: 0
      }
    });
    expect(started.details).not.toHaveProperty("operation");
    expect(succeeded.details).not.toHaveProperty("operation");
  });

  it("emits failed with SanitizedErrorInfo at error level", async () => {
    const logger = { log: vi.fn() };
    const error = Object.assign(
      new Error("SQL failed for C:\\Users\\name\\secret.md"),
      {
        code: "SQLITE_CONSTRAINT",
        stack: "stack with SQL and secret.md"
      }
    );

    await expect(
      withDbOperationLog(
        {
          logger,
          dbOperation: "update",
          dbEntityKind: "glossaryEntry",
          now: sequenceNow([200, 209])
        },
        async () => {
          throw error;
        }
      )
    ).rejects.toBe(error);

    const started = logger.log.mock.calls[0][0];
    const failed = logger.log.mock.calls[1][0];

    expect(failed).toMatchObject({
      level: "error",
      event: "db.operation.failed",
      details: {
        dbOperationId: started.details?.dbOperationId,
        dbOperation: "update",
        dbEntityKind: "glossaryEntry",
        result: "failed",
        durationMs: 9,
        error: {
          name: "Error",
          code: "SQLITE_CONSTRAINT",
          category: "database"
        }
      }
    });
    expect(JSON.stringify(failed)).not.toContain("secret.md");
    expect(JSON.stringify(failed)).not.toContain("stack");
  });

  it("emits skipped with a DB reason and no started event", () => {
    const logger = { log: vi.fn() };

    logDbOperationSkipped({
      logger,
      dbOperation: "update",
      dbEntityKind: "glossaryEntry",
      reason: "not_found",
      now: sequenceNow([300, 300])
    });

    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith({
      level: "debug",
      event: "db.operation.skipped",
      details: {
        dbOperationId: expect.any(String),
        dbOperation: "update",
        dbEntityKind: "glossaryEntry",
        result: "ignored",
        reason: "not_found",
        durationMs: 0
      }
    });
  });

  it("does not emit count for initialize or transaction operations", async () => {
    const logger = { log: vi.fn() };

    await withDbOperationLog(
      {
        logger,
        dbOperation: "initialize",
        dbEntityKind: "database"
      },
      async () => dbOperationResult(undefined, 3)
    );
    await withDbOperationLog(
      {
        logger,
        dbOperation: "transaction",
        dbEntityKind: "database"
      },
      async () => dbOperationResult(undefined, 2)
    );

    const terminalEvents = logger.log.mock.calls
      .map((call) => call[0])
      .filter((event) => event.event === "db.operation.succeeded");

    expect(terminalEvents).toHaveLength(2);
    expect(terminalEvents[0].details).not.toHaveProperty("count");
    expect(terminalEvents[1].details).not.toHaveProperty("count");
  });

  it("uses distinct opaque IDs for consecutive operations in stable order", async () => {
    const logger = { log: vi.fn() };
    const unsafeValue = "王都アルセリア C:\\Users\\name\\novel.md";

    await withDbOperationLog(
      {
        logger,
        dbOperation: "create",
        dbEntityKind: "glossaryEntry"
      },
      async () => dbOperationResult(unsafeValue, 1)
    );
    await withDbOperationLog(
      {
        logger,
        dbOperation: "list",
        dbEntityKind: "glossaryEntry"
      },
      async () => dbOperationResult([unsafeValue], 1)
    );

    const eventIds = logger.log.mock.calls.map(
      (call) => call[0].details?.dbOperationId
    );
    const firstId = eventIds[0];
    const secondId = eventIds[2];

    expect(firstId).toBe(eventIds[1]);
    expect(secondId).toBe(eventIds[3]);
    expect(firstId).not.toBe(secondId);
    expect(eventIds).toEqual([firstId, firstId, secondId, secondId]);
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(unsafeValue);
  });
});

function sequenceNow(values: number[]): () => number {
  let index = 0;

  return () => values[index++] ?? values[values.length - 1];
}
