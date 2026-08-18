import { describe, expect, it, vi } from "vitest";
import {
  lineJumpMessageKey,
  resolveLineJumpFooterModel,
  resolveLineJumpPaletteState,
  type LineJumpPaletteState
} from "../../src/renderer/lineJumpPaletteState";
import type { LineJumpEditorSnapshot } from "../../src/renderer/lineJumpQuery";

function buildSnapshot(
  lineCount: number,
  getLineText: (line: number) => string = () => ""
): LineJumpEditorSnapshot {
  return { lineCount, getLineText };
}

describe("resolveLineJumpPaletteState", () => {
  it("passes parser-invalid/empty/unsafe kinds through unchanged, without consulting the editor snapshot", () => {
    const getLineText = vi.fn(() => "");
    const snapshot = buildSnapshot(1000, getLineText);

    for (const query of ["", "abc", "0", "1.5", "１２", "9,007,199,254,740,992"]) {
      resolveLineJumpPaletteState(query, snapshot);
    }

    expect(getLineText).not.toHaveBeenCalled();
  });

  it("maps each non-valid query kind to the matching palette state kind", () => {
    const snapshot = buildSnapshot(1000);

    expect(resolveLineJumpPaletteState("", snapshot)).toEqual({ kind: "empty" });
    expect(resolveLineJumpPaletteState("１２", snapshot)).toEqual({
      kind: "fullWidthDigits"
    });
    expect(resolveLineJumpPaletteState("1.5", snapshot)).toEqual({
      kind: "decimal"
    });
    expect(resolveLineJumpPaletteState("abc", snapshot)).toEqual({
      kind: "invalid"
    });
    expect(
      resolveLineJumpPaletteState("9,007,199,254,740,992", snapshot)
    ).toEqual({ kind: "unsafeInteger" });
  });

  it("returns disabled (not out-of-range) when there is no active line-addressable editor", () => {
    expect(resolveLineJumpPaletteState("42", null)).toEqual({
      kind: "disabled",
      line: 42
    });
  });

  it("returns outOfRange when a valid query produces zero candidates", () => {
    const snapshot = buildSnapshot(10);

    expect(resolveLineJumpPaletteState("99999", snapshot)).toEqual({
      kind: "outOfRange"
    });
  });

  it("returns executable with the exact-match-first candidate list when in range", () => {
    const snapshot = buildSnapshot(20, (line) => `text ${line}`);
    const result = resolveLineJumpPaletteState("1", snapshot, 3);

    expect(result.kind).toBe("executable");
    if (result.kind === "executable") {
      expect(result.candidates.map((c) => c.line)).toEqual([1, 10, 11]);
    }
  });

  it("uses the normalized line number as the exact-match candidate for leading-zero/comma queries", () => {
    const snapshot = buildSnapshot(2000, () => "");
    const zeroPadded = resolveLineJumpPaletteState("007", snapshot);
    const commaGrouped = resolveLineJumpPaletteState("1,000", snapshot);

    expect(zeroPadded.kind).toBe("executable");
    if (zeroPadded.kind === "executable") {
      expect(zeroPadded.candidates[0]?.line).toBe(7);
    }
    expect(commaGrouped.kind).toBe("executable");
    if (commaGrouped.kind === "executable") {
      expect(commaGrouped.candidates[0]?.line).toBe(1000);
    }
  });

  it("forwards maxCandidates through to candidate generation", () => {
    const snapshot = buildSnapshot(100000, () => "");
    const result = resolveLineJumpPaletteState("1", snapshot, 5);

    expect(result.kind).toBe("executable");
    if (result.kind === "executable") {
      expect(result.candidates).toHaveLength(5);
    }
  });

  it("reports remainingCount as 0 when every match fits within the display limit", () => {
    const snapshot = buildSnapshot(130, () => "");
    const result = resolveLineJumpPaletteState("12", snapshot, 20);

    expect(result.kind).toBe("executable");
    if (result.kind === "executable") {
      expect(result.remainingCount).toBe(0);
    }
  });

  it("reports remainingCount as totalMatchCount - displayed candidates when there are more matches (#148 follow-up)", () => {
    const snapshot = buildSnapshot(100000, () => "");
    const result = resolveLineJumpPaletteState("1", snapshot, 20);

    expect(result.kind).toBe("executable");
    if (result.kind === "executable") {
      expect(result.candidates).toHaveLength(20);
      expect(result.remainingCount).toBeGreaterThan(0);
    }
  });
});

describe("resolveLineJumpFooterModel", () => {
  it("shows the generic disabled command message and dims Enter for a disabled result", () => {
    expect(
      resolveLineJumpFooterModel({ kind: "disabled", line: 42 })
    ).toEqual({ statusKey: "commandPalette.footer.disabled", canRunSelected: false });
  });

  it("enables Enter with no status text for an executable result with no remaining candidates", () => {
    expect(
      resolveLineJumpFooterModel({
        kind: "executable",
        candidates: [{ line: 42, preview: { kind: "empty" } }],
        remainingCount: 0
      })
    ).toEqual({ statusKey: null, canRunSelected: true });
  });

  it("shows the remaining-candidate count when more candidates exist than are displayed (#148 follow-up)", () => {
    expect(
      resolveLineJumpFooterModel({
        kind: "executable",
        candidates: [{ line: 1, preview: { kind: "empty" } }],
        remainingCount: 133
      })
    ).toEqual({
      statusKey: "commandPalette.lineJump.moreCandidates",
      statusValues: { count: 133 },
      canRunSelected: true
    });
  });

  it("still enables Enter while showing the remaining-candidate count", () => {
    const footer = resolveLineJumpFooterModel({
      kind: "executable",
      candidates: [{ line: 1, preview: { kind: "empty" } }],
      remainingCount: 5
    });

    expect(footer.canRunSelected).toBe(true);
  });

  it("shows no status text and dims Enter for every message state", () => {
    const messageStates: readonly LineJumpPaletteState[] = [
      { kind: "empty" },
      { kind: "fullWidthDigits" },
      { kind: "decimal" },
      { kind: "invalid" },
      { kind: "unsafeInteger" },
      { kind: "outOfRange" }
    ];

    for (const state of messageStates) {
      expect(resolveLineJumpFooterModel(state)).toEqual({
        statusKey: null,
        canRunSelected: false
      });
    }
  });
});

describe("lineJumpMessageKey", () => {
  it("returns null for executable and disabled (they render a result row, not a message)", () => {
    expect(
      lineJumpMessageKey({ kind: "executable", candidates: [], remainingCount: 0 })
    ).toBeNull();
    expect(lineJumpMessageKey({ kind: "disabled", line: 1 })).toBeNull();
  });

  it("maps empty, full-width, decimal, and out-of-range to distinct keys", () => {
    expect(lineJumpMessageKey({ kind: "empty" })).toBe(
      "commandPalette.lineJump.empty"
    );
    expect(lineJumpMessageKey({ kind: "fullWidthDigits" })).toBe(
      "commandPalette.lineJump.fullWidthDigits"
    );
    expect(lineJumpMessageKey({ kind: "decimal" })).toBe(
      "commandPalette.lineJump.decimal"
    );
    expect(lineJumpMessageKey({ kind: "outOfRange" })).toBe(
      "commandPalette.lineJump.outOfRange"
    );
  });

  it("uses the same message key for invalid and unsafeInteger, per the issue's suggested text", () => {
    expect(lineJumpMessageKey({ kind: "invalid" })).toBe(
      "commandPalette.lineJump.invalid"
    );
    expect(lineJumpMessageKey({ kind: "unsafeInteger" })).toBe(
      "commandPalette.lineJump.invalid"
    );
  });
});
