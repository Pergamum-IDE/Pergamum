import { describe, expect, it } from "vitest";
import { formatLineJumpLinePreview } from "../../src/renderer/lineJumpPreview";

describe("formatLineJumpLinePreview", () => {
  it("returns the line text unchanged when at or under the preview length", () => {
    expect(formatLineJumpLinePreview("short line")).toEqual({
      kind: "text",
      text: "short line"
    });
  });

  it("truncates to 20 characters and appends the ASCII ellipsis when longer", () => {
    const line = "this line is definitely longer than twenty characters";

    expect(formatLineJumpLinePreview(line)).toEqual({
      kind: "text",
      text: `${line.slice(0, 20)}...`
    });
  });

  it("does not truncate a line exactly at the preview length", () => {
    const line = "12345678901234567890"; // 20 chars

    expect(line).toHaveLength(20);
    expect(formatLineJumpLinePreview(line)).toEqual({
      kind: "text",
      text: line
    });
  });

  it("truncates the issue's example the same way with a length of 10", () => {
    expect(
      formatLineJumpLinePreview("吾輩は猫である。名前はまだ無い。", 10)
    ).toEqual({ kind: "text", text: "吾輩は猫である。名前..." });
  });

  it("trims leading whitespace for display, without affecting the truncation length count", () => {
    expect(formatLineJumpLinePreview("   indented text")).toEqual({
      kind: "text",
      text: "indented text"
    });
  });

  it("does not trim trailing whitespace", () => {
    expect(formatLineJumpLinePreview("text   ")).toEqual({
      kind: "text",
      text: "text   "
    });
  });

  it("returns empty for a zero-length line", () => {
    expect(formatLineJumpLinePreview("")).toEqual({ kind: "empty" });
  });

  it("returns empty for a whitespace-only line", () => {
    expect(formatLineJumpLinePreview("   ")).toEqual({ kind: "empty" });
    expect(formatLineJumpLinePreview("\t\t")).toEqual({ kind: "empty" });
  });

  it("accepts a custom preview length and ellipsis, for a future settings-backed override", () => {
    expect(formatLineJumpLinePreview("abcdefgh", 4, "…")).toEqual({
      kind: "text",
      text: "abcd…"
    });
  });
});
