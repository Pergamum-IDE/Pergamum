import { describe, expect, it, vi } from "vitest";
import {
  createLineJumpEditorSnapshot,
  documentLineStartOffset,
  validateLineJumpQuery,
  type LineJumpQueryValidation
} from "../../src/renderer/lineJumpQuery";

const cases: readonly [string, LineJumpQueryValidation][] = [
  ["", { kind: "empty" }],
  ["0", { kind: "invalid" }],
  ["-1", { kind: "invalid" }],
  ["+1", { kind: "invalid" }],
  ["1.5", { kind: "decimal" }],
  ["1,5", { kind: "invalid" }],
  ["1e10", { kind: "invalid" }],
  ["1E10", { kind: "invalid" }],
  ["e^10", { kind: "invalid" }],
  ["abc", { kind: "invalid" }],
  ["１２", { kind: "fullWidthDigits" }],
  ["99999999999999999999", { kind: "unsafeInteger" }],
  ["9,007,199,254,740,991", { kind: "valid", line: Number.MAX_SAFE_INTEGER }],
  ["9,007,199,254,740,992", { kind: "unsafeInteger" }],
  ["1", { kind: "valid", line: 1 }],
  ["007", { kind: "valid", line: 7 }],
  ["42", { kind: "valid", line: 42 }],
  ["65535", { kind: "valid", line: 65535 }],
  ["1,000", { kind: "valid", line: 1000 }],
  ["12,345", { kind: "valid", line: 12345 }],
  ["1,234,567", { kind: "valid", line: 1234567 }],
  // Invalid comma grouping.
  ["1,00", { kind: "invalid" }],
  ["12,34", { kind: "invalid" }],
  ["1,2,3", { kind: "invalid" }],
  ["1,0000", { kind: "invalid" }]
];

describe("validateLineJumpQuery", () => {
  it.each(cases)("%j", (query, expected) => {
    expect(validateLineJumpQuery(query)).toEqual(expected);
  });

  it("does not treat Number.MAX_SAFE_INTEGER + 1 as safe", () => {
    const query = String(BigInt(Number.MAX_SAFE_INTEGER) + 1n);

    expect(validateLineJumpQuery(query)).toEqual({ kind: "unsafeInteger" });
  });

  it("does not silently normalize full-width digits to ASCII", () => {
    expect(validateLineJumpQuery("１２")).not.toEqual({ kind: "valid", line: 12 });
  });

  it("does not parse via Number() before syntax validation (mixed garbage stays invalid, not NaN-derived)", () => {
    expect(validateLineJumpQuery("abc")).toEqual({ kind: "invalid" });
    expect(validateLineJumpQuery("1,abc")).toEqual({ kind: "invalid" });
  });
});

describe("documentLineStartOffset", () => {
  it("returns 0 for line 1 of any document", () => {
    expect(documentLineStartOffset("alpha\nbeta\ngamma", 1)).toBe(0);
    expect(documentLineStartOffset("", 1)).toBe(0);
  });

  it("returns the offset just past each preceding newline", () => {
    const content = "alpha\nbeta\ngamma";

    expect(documentLineStartOffset(content, 2)).toBe(6);
    expect(documentLineStartOffset(content, 3)).toBe(11);
  });

  it("returns null for line 0 and negative lines", () => {
    expect(documentLineStartOffset("alpha\nbeta", 0)).toBeNull();
    expect(documentLineStartOffset("alpha\nbeta", -1)).toBeNull();
  });

  it("returns null when line exceeds the document's line count", () => {
    expect(documentLineStartOffset("alpha\nbeta", 3)).toBeNull();
    expect(documentLineStartOffset("", 2)).toBeNull();
  });

  it("resolves the last line successfully", () => {
    const content = "alpha\nbeta\ngamma";

    expect(documentLineStartOffset(content, 3)).toBe(11);
    expect(documentLineStartOffset(content, 4)).toBeNull();
  });
});

describe("createLineJumpEditorSnapshot", () => {
  it("reports lineCount and getLineText consistent with a plain \"\\n\" split", () => {
    const snapshot = createLineJumpEditorSnapshot("alpha\nbeta\ngamma");

    expect(snapshot.lineCount).toBe(3);
    expect(snapshot.getLineText(1)).toBe("alpha");
    expect(snapshot.getLineText(2)).toBe("beta");
    expect(snapshot.getLineText(3)).toBe("gamma");
  });

  it('returns "" for an out-of-range line instead of throwing', () => {
    const snapshot = createLineJumpEditorSnapshot("alpha\nbeta");

    expect(snapshot.getLineText(0)).toBe("");
    expect(snapshot.getLineText(-1)).toBe("");
    expect(snapshot.getLineText(3)).toBe("");
  });

  it("treats an empty document as a single empty line", () => {
    const snapshot = createLineJumpEditorSnapshot("");

    expect(snapshot.lineCount).toBe(1);
    expect(snapshot.getLineText(1)).toBe("");
  });

  it("splits the content at most once no matter how many times lineCount/getLineText are read (#148 performance)", () => {
    const splitSpy = vi.spyOn(String.prototype, "split");

    try {
      const snapshot = createLineJumpEditorSnapshot("a\nb\nc\nd\ne");

      void snapshot.lineCount;
      snapshot.getLineText(1);
      snapshot.getLineText(2);
      snapshot.getLineText(5);
      void snapshot.lineCount;

      expect(splitSpy).toHaveBeenCalledTimes(1);
    } finally {
      splitSpy.mockRestore();
    }
  });

  it("does not split at all until lineCount or getLineText is actually read", () => {
    const splitSpy = vi.spyOn(String.prototype, "split");

    try {
      createLineJumpEditorSnapshot("a\nb\nc");

      expect(splitSpy).not.toHaveBeenCalled();
    } finally {
      splitSpy.mockRestore();
    }
  });
});
