import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatLocalDebugLogTimestamp,
  resolveDebugLogFilePath
} from "../../src/main/debugLogPath";

describe("debug log path helpers", () => {
  it("resolves debug log file names under the injected logs directory", () => {
    const logsDir = path.join("C:\\Users\\technerd\\AppData", "Pergamum", "logs");
    const openedAt = new Date(2026, 7, 14, 15, 32, 4, 812);
    const filePath = resolveDebugLogFilePath({
      logsDir,
      sessionId: "018f4b8c-7a2b-4c3d-9e4f-100000000001",
      openedAt
    });

    expect(path.dirname(filePath)).toBe(logsDir);
    expect(path.basename(filePath)).toBe(
      "Pergamum-debug-018f4b8c-7a2b-4c3d-9e4f-100000000001--2026-08-14--15-32.jsonl"
    );
  });

  it("adds a two-digit collision suffix when requested", () => {
    const filePath = resolveDebugLogFilePath({
      logsDir: "logs",
      sessionId: "018f4b8c-7a2b-4c3d-9e4f-100000000001",
      openedAt: new Date(2026, 7, 14, 15, 32),
      suffix: 2
    });

    expect(path.basename(filePath)).toBe(
      "Pergamum-debug-018f4b8c-7a2b-4c3d-9e4f-100000000001--2026-08-14--15-32-02.jsonl"
    );
  });

  it("formats timestamps with a local UTC offset instead of a Z suffix", () => {
    const timestamp = formatLocalDebugLogTimestamp(
      new Date(2026, 7, 14, 15, 29, 4, 812)
    );

    expect(timestamp).toMatch(
      /^2026-08-14T15:29:04\.812[+-][0-9]{2}:[0-9]{2}$/
    );
    expect(timestamp.endsWith("Z")).toBe(false);
  });
});

