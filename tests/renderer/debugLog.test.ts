import { describe, expect, it } from "vitest";
import { durationSincePerformanceMark } from "../../src/renderer/debugLog";

describe("durationSincePerformanceMark", () => {
  it("returns a non-negative number", () => {
    const startedAt = performance.now();

    expect(durationSincePerformanceMark(startedAt)).toBeGreaterThanOrEqual(0);
  });

  it("rounds to a whole number of milliseconds", () => {
    const duration = durationSincePerformanceMark(performance.now() - 1.4);

    expect(Number.isInteger(duration)).toBe(true);
  });

  it("grows as more time elapses since the mark", async () => {
    const startedAt = performance.now();

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(durationSincePerformanceMark(startedAt)).toBeGreaterThan(0);
  });
});
