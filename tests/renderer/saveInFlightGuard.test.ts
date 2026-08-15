import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createSaveInFlightGuard } from "../../src/renderer/saveInFlightGuard";

describe("save in-flight guard", () => {
  it("does not run save operations in parallel", async () => {
    const guard = createSaveInFlightGuard();
    const save = vi.fn(() => new Promise<void>(() => undefined));
    const onIgnored = vi.fn();

    void guard.run(save);
    const secondResult = await guard.run(save, onIgnored);

    expect(secondResult).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
    expect(onIgnored).toHaveBeenCalledTimes(1);
  });

  it("allows another save after a save completes", async () => {
    const guard = createSaveInFlightGuard();
    const save = vi.fn(() => Promise.resolve("saved"));

    await expect(guard.run(save)).resolves.toBe("saved");
    await expect(guard.run(save)).resolves.toBe("saved");

    expect(save).toHaveBeenCalledTimes(2);
  });

  it("releases the guard after a failed save", async () => {
    const guard = createSaveInFlightGuard();
    const failedSave = vi.fn(() => Promise.reject(new Error("failed")));
    const nextSave = vi.fn(() => Promise.resolve("saved"));

    await expect(guard.run(failedSave)).rejects.toThrow("failed");
    await expect(guard.run(nextSave)).resolves.toBe("saved");

    expect(failedSave).toHaveBeenCalledTimes(1);
    expect(nextSave).toHaveBeenCalledTimes(1);
  });

  it("releases the guard in a finally block", () => {
    const source = readFileSync("src/renderer/saveInFlightGuard.ts", "utf8");

    expect(source).toContain("finally");
  });
});
