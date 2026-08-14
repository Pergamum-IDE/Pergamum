import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDebugLogger,
  type CreateDebugLoggerOptions
} from "../../src/main/debugLogger";
import { resolveDebugLogFilePath } from "../../src/main/debugLogPath";
import type { DebugLogEvent } from "../../src/shared/debugLog";

const sessionId = "018f4b8c-7a2b-4c3d-9e4f-100000000001";
const runtime: CreateDebugLoggerOptions["runtime"] = {
  appVersion: "0.1.0",
  platform: "win32",
  arch: "x64",
  locale: "ja",
  electronVersion: "39.8.10",
  nodeVersion: "20.19.11",
  debugMode: true
};

let loggers: Array<ReturnType<typeof createDebugLogger>> = [];

describe("debug logger", () => {
  let logsDir: string;

  beforeEach(async () => {
    loggers = [];
    logsDir = await fs.mkdtemp(path.join(os.tmpdir(), "pergamum-debug-log-"));
  });

  afterEach(async () => {
    for (const logger of loggers) {
      logger.flushAndClose();
    }

    await fs.rm(logsDir, {
      recursive: true,
      force: true
    });
  });

  it("does not create a log file when disabled", async () => {
    const logger = createTestLogger({
      enabled: false,
      runtime
    });

    logger.log({
      level: "info",
      event: "app.start",
      details: {
        debugMode: true
      }
    });
    logger.openFileSink(logsDir);

    await expect(jsonlFiles(logsDir)).resolves.toEqual([]);
  });

  it("flushes pre-sink events and writes log.file.opened metadata", async () => {
    const logger = createTestLogger(
      enabledOptions([
        new Date(2026, 7, 14, 15, 29, 4, 812),
        new Date(2026, 7, 14, 15, 32, 0, 0),
        new Date(2026, 7, 14, 15, 32, 0, 1)
      ])
    );

    logger.log({
      level: "info",
      event: "app.start",
      details: {
        appVersion: "renderer-version",
        platform: "renderer-platform",
        arch: "renderer-arch",
        locale: "renderer-locale",
        electronVersion: "renderer-electron",
        nodeVersion: "renderer-node",
        debugMode: false,
        source: "renderer",
        message: "free form"
      }
    });
    logger.openFileSink(logsDir);

    const files = await jsonlFiles(logsDir);
    expect(files).toHaveLength(1);
    expect(path.basename(files[0])).toBe(
      `Pergamum-debug-${sessionId}--2026-08-14--15-32.jsonl`
    );

    const events = await readEvents(files[0]);
    expect(events.map((event) => event.seq)).toEqual([1, 2]);
    expect(events[0]).toMatchObject({
      level: "info",
      event: "app.start",
      sessionId,
      details: {
        appVersion: runtime.appVersion,
        locale: runtime.locale,
        electronVersion: runtime.electronVersion,
        nodeVersion: runtime.nodeVersion,
        debugMode: true,
        droppedKeyCount: 2
      }
    });
    expect(events[1]).toMatchObject({
      level: "info",
      event: "log.file.opened",
      details: {
        preSinkQueuedEventCount: 1,
        droppedEventCount: 0,
        rotated: false
      }
    });
    expect(JSON.stringify(events)).not.toContain("source");
    expect(JSON.stringify(events)).not.toContain("free form");
  });

  it("drops the oldest pre-sink events past the queue limit", async () => {
    const logger = createTestLogger(
      enabledOptions(
        [
          new Date(2026, 7, 14, 15, 29, 0, 1),
          new Date(2026, 7, 14, 15, 29, 0, 2),
          new Date(2026, 7, 14, 15, 29, 0, 3),
          new Date(2026, 7, 14, 15, 29, 0, 4),
          new Date(2026, 7, 14, 15, 29, 0, 5)
        ],
        {
          preSinkQueueLimit: 2
        }
      )
    );

    logger.log({
      level: "debug",
      event: "command.invoked",
      details: { commandId: "workspace.files.focus" }
    });
    logger.log({
      level: "debug",
      event: "command.invoked",
      details: { commandId: "workspace.search.focus" }
    });
    logger.log({
      level: "debug",
      event: "command.invoked",
      details: { commandId: "workspace.glossary.focus" }
    });
    logger.openFileSink(logsDir);

    const events = await readEvents((await jsonlFiles(logsDir))[0]);

    expect(events.map((event) => event.seq)).toEqual([2, 3, 4]);
    expect(events[2].details).toMatchObject({
      preSinkQueuedEventCount: 2,
      droppedEventCount: 1
    });
  });

  it("rotates by line count and writes log.file.opened first in the new file", async () => {
    const logger = createTestLogger(
      enabledOptions(
        [
          new Date(2026, 7, 14, 15, 29, 0, 1),
          new Date(2026, 7, 14, 15, 32, 0, 0),
          new Date(2026, 7, 14, 15, 32, 0, 1),
          new Date(2026, 7, 14, 15, 32, 0, 2),
          new Date(2026, 7, 14, 15, 32, 0, 3),
          new Date(2026, 7, 14, 15, 32, 0, 4)
        ],
        {
          maxLines: 2
        }
      )
    );

    logger.log({
      level: "info",
      event: "app.start",
      details: { debugMode: true }
    });
    logger.openFileSink(logsDir);
    logger.log({
      level: "warn",
      event: "command.invoked",
      details: { commandId: "workspace.files.focus" }
    });

    const files = await jsonlFiles(logsDir);
    expect(files.map((filePath) => path.basename(filePath))).toEqual([
      `Pergamum-debug-${sessionId}--2026-08-14--15-32.jsonl`,
      `Pergamum-debug-${sessionId}--2026-08-14--15-32-02.jsonl`
    ]);

    const firstFileEvents = await readEvents(files[0]);
    const secondFileEvents = await readEvents(files[1]);

    expect(firstFileEvents.map((event) => event.event)).toEqual([
      "app.start",
      "log.file.opened"
    ]);
    expect(secondFileEvents[0]).toMatchObject({
      seq: 3,
      level: "info",
      event: "log.file.opened",
      details: { rotated: true }
    });
    expect(secondFileEvents[1]).toMatchObject({
      seq: 4,
      level: "debug",
      event: "command.invoked"
    });
  });

  it("starts suffix search from the unsuffixed file for each open", async () => {
    const openedAt = new Date(2026, 7, 14, 15, 32, 0, 0);
    await fs.writeFile(
      resolveDebugLogFilePath({
        logsDir,
        sessionId,
        openedAt
      }),
      ""
    );
    const logger = createTestLogger(
      enabledOptions([openedAt, openedAt], {
        maxLines: 10
      })
    );

    logger.openFileSink(logsDir);

    expect(path.basename((await jsonlFiles(logsDir))[1])).toBe(
      `Pergamum-debug-${sessionId}--2026-08-14--15-32-02.jsonl`
    );
  });

  it("degrades without crashing when suffixes through -99 collide", async () => {
    const openedAt = new Date(2026, 7, 14, 15, 32, 0, 0);

    for (const suffix of [undefined, ...range(2, 99)]) {
      await fs.writeFile(
        resolveDebugLogFilePath({
          logsDir,
          sessionId,
          openedAt,
          suffix
        }),
        ""
      );
    }

    const logger = createTestLogger(enabledOptions([openedAt]));

    expect(() => logger.openFileSink(logsDir)).not.toThrow();
    expect(await jsonlFiles(logsDir)).toHaveLength(99);
  });

  it("rejects unknown renderer events before assigning seq", async () => {
    const logger = createTestLogger(
      enabledOptions([
        new Date(2026, 7, 14, 15, 29, 0, 1),
        new Date(2026, 7, 14, 15, 29, 0, 2),
        new Date(2026, 7, 14, 15, 29, 0, 3)
      ])
    );

    logger.logRendererRequest({
      level: "info",
      event: "catalog.outside",
      details: { commandId: "workspace.files.focus" }
    });
    logger.logRendererRequest({
      level: "debug",
      event: "command.invoked",
      details: {
        commandId: "renderer.sent.unknown",
        projectRef: "project:session:999"
      }
    });
    logger.openFileSink(logsDir);

    const events = await readEvents((await jsonlFiles(logsDir))[0]);

    expect(events.map((event) => event.seq)).toEqual([1, 2]);
    expect(events[0]).toMatchObject({
      event: "command.invoked",
      details: {
        commandId: "unknown",
        droppedKeyCount: 1
      }
    });
  });

  it("degrades on write failure without recursively logging to the broken sink", () => {
    const writtenLines: string[] = [];
    const warnings: string[] = [];
    const logger = createTestLogger(
      enabledOptions(
        [
          new Date(2026, 7, 14, 15, 29, 0, 1),
          new Date(2026, 7, 14, 15, 29, 0, 2),
          new Date(2026, 7, 14, 15, 29, 0, 3)
        ],
        {
          fileSystem: {
            mkdirSync: () => undefined,
            openSync: () => 1,
            writeSync: (_fd, data) => {
              if (writtenLines.length === 1) {
                throw Object.assign(new Error("write failed"), {
                  code: "EIO"
                });
              }

              writtenLines.push(data);
              return data.length;
            },
            closeSync: () => undefined
          },
          isDevelopmentBuild: true,
          warn: (message) => warnings.push(message)
        }
      )
    );

    logger.openFileSink("logs");

    expect(() => {
      logger.log({
        level: "debug",
        event: "command.invoked",
        details: { commandId: "workspace.files.focus" }
      });
      logger.log({
        level: "debug",
        event: "command.invoked",
        details: { commandId: "workspace.search.focus" }
      });
    }).not.toThrow();

    expect(writtenLines).toHaveLength(1);
    expect(writtenLines[0]).toContain("log.file.opened");
    expect(writtenLines.join("")).not.toContain("log.file.write.failed");
    expect(warnings).toContain("Pergamum debug log write failed.");
  });
});

function createTestLogger(
  options: CreateDebugLoggerOptions
): ReturnType<typeof createDebugLogger> {
  const logger = createDebugLogger(options);
  loggers.push(logger);
  return logger;
}

function enabledOptions(
  dates: Date[],
  overrides: Partial<CreateDebugLoggerOptions> = {}
): CreateDebugLoggerOptions {
  let index = 0;

  return {
    enabled: true,
    runtime,
    sessionId,
    isDevelopmentBuild: false,
    now: () => dates[index++] ?? dates[dates.length - 1],
    ...overrides
  };
}

function range(start: number, end: number): number[] {
  return Array.from(
    { length: end - start + 1 },
    (_value, index) => start + index
  );
}

function debugLogFileSuffixRank(fileName: string): number {
  const match = /--\d{4}-\d{2}-\d{2}--\d{2}-\d{2}(?:-(\d{2}))?\.jsonl$/.exec(
    fileName
  );

  return match?.[1] ? Number(match[1]) : 1;
}

async function jsonlFiles(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath);

  return entries
    .filter((entry) => entry.endsWith(".jsonl"))
    .sort(
      (left, right) =>
        debugLogFileSuffixRank(left) - debugLogFileSuffixRank(right)
    )
    .map((entry) => path.join(directoryPath, entry));
}

async function readEvents(filePath: string): Promise<DebugLogEvent[]> {
  const content = await fs.readFile(filePath, "utf8");

  return content
    .trim()
    .split(/\n/)
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as DebugLogEvent);
}
