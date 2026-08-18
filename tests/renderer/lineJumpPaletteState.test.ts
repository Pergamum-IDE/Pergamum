import { describe, expect, it, vi } from "vitest";
import {
  lineJumpMessageKey,
  resolveLineJumpFooterModel,
  resolveLineJumpPaletteState,
  type LineJumpPaletteState
} from "../../src/renderer/lineJumpPaletteState";

describe("resolveLineJumpPaletteState", () => {
  it("passes parser-invalid/empty/unsafe kinds through unchanged, without consulting range", () => {
    const isInRange = vi.fn(() => true);

    for (const query of ["", "abc", "0", "1.5", "１２", "9,007,199,254,740,992"]) {
      resolveLineJumpPaletteState(query, true, isInRange);
    }

    expect(isInRange).not.toHaveBeenCalled();
  });

  it("maps each non-valid query kind to the matching palette state kind", () => {
    expect(resolveLineJumpPaletteState("", true, () => true)).toEqual({
      kind: "empty"
    });
    expect(resolveLineJumpPaletteState("１２", true, () => true)).toEqual({
      kind: "fullWidthDigits"
    });
    expect(resolveLineJumpPaletteState("1.5", true, () => true)).toEqual({
      kind: "decimal"
    });
    expect(resolveLineJumpPaletteState("abc", true, () => true)).toEqual({
      kind: "invalid"
    });
    expect(
      resolveLineJumpPaletteState("9,007,199,254,740,992", true, () => true)
    ).toEqual({ kind: "unsafeInteger" });
  });

  it("returns disabled (not out-of-range) when the active editor is not line-addressable, regardless of range", () => {
    expect(resolveLineJumpPaletteState("42", false, () => true)).toEqual({
      kind: "disabled",
      line: 42
    });
    expect(resolveLineJumpPaletteState("42", false, () => false)).toEqual({
      kind: "disabled",
      line: 42
    });
  });

  it("checks range only once editor context is confirmed line-addressable", () => {
    const isInRange = vi.fn(() => false);

    expect(resolveLineJumpPaletteState("99999", true, isInRange)).toEqual({
      kind: "outOfRange"
    });
    expect(isInRange).toHaveBeenCalledWith(99999);
  });

  it("returns executable with the normalized line number when in range", () => {
    expect(resolveLineJumpPaletteState("007", true, () => true)).toEqual({
      kind: "executable",
      line: 7
    });
    expect(resolveLineJumpPaletteState("1,000", true, () => true)).toEqual({
      kind: "executable",
      line: 1000
    });
  });
});

describe("resolveLineJumpFooterModel", () => {
  it("shows the generic disabled command message and dims Enter for a disabled result", () => {
    expect(
      resolveLineJumpFooterModel({ kind: "disabled", line: 42 })
    ).toEqual({ statusKey: "commandPalette.footer.disabled", canRunSelected: false });
  });

  it("enables Enter with no status text for an executable result", () => {
    expect(
      resolveLineJumpFooterModel({ kind: "executable", line: 42 })
    ).toEqual({ statusKey: null, canRunSelected: true });
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
    expect(lineJumpMessageKey({ kind: "executable", line: 1 })).toBeNull();
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
