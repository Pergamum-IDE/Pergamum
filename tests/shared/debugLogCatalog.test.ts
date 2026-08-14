import { describe, expect, it } from "vitest";
import {
  debugLogEventNames,
  type DebugLogDetails
} from "../../src/shared/debugLog";

describe("debug log catalog", () => {
  it("does not include removed or out-of-scope event names", () => {
    expect(debugLogEventNames).not.toContain("debug.mode.enabled");
    expect(debugLogEventNames).not.toContain("log.file.rotated");
  });

  it("does not add an initial warn event catalog", () => {
    const warnLikeEvents = debugLogEventNames.filter((eventName) =>
      eventName.includes(".warn")
    );

    expect(warnLikeEvents).toEqual([]);
  });

  it("does not include a generic count detail key", () => {
    type HasGenericCount = "count" extends keyof DebugLogDetails ? true : false;
    const hasGenericCount: HasGenericCount = false;

    expect(hasGenericCount).toBe(false);
  });
});

