import { describe, expect, it, vi } from "vitest";
import {
  performClipboardCopy,
  type ClipboardAdapter
} from "../../../src/renderer/dialog/clipboardAdapter";

function fakeAdapter(writeText: ClipboardAdapter["writeText"]): ClipboardAdapter {
  return { writeText };
}

describe("performClipboardCopy (#182 D-9, DOM-free)", () => {
  it("calls the adapter with exactly the given text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await performClipboardCopy(fakeAdapter(writeText), "diagnostic text");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("diagnostic text");
  });

  it("returns { ok: true } when the adapter succeeds", async () => {
    const adapter = fakeAdapter(vi.fn().mockResolvedValue(undefined));

    await expect(performClipboardCopy(adapter, "text")).resolves.toEqual({
      ok: true
    });
  });

  it("returns { ok: false } when the adapter rejects, without throwing", async () => {
    const adapter = fakeAdapter(
      vi.fn().mockRejectedValue(new Error("clipboard denied"))
    );

    await expect(performClipboardCopy(adapter, "text")).resolves.toEqual({
      ok: false
    });
  });

  it("does not swallow the failure silently — the caller can distinguish success from failure", async () => {
    const failingAdapter = fakeAdapter(
      vi.fn().mockRejectedValue(new Error("denied"))
    );
    const succeedingAdapter = fakeAdapter(vi.fn().mockResolvedValue(undefined));

    const failureResult = await performClipboardCopy(failingAdapter, "x");
    const successResult = await performClipboardCopy(succeedingAdapter, "x");

    expect(failureResult.ok).toBe(false);
    expect(successResult.ok).toBe(true);
  });
});
