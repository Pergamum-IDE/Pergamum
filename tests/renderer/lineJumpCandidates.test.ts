import { describe, expect, it, vi } from "vitest";
import {
  resolveLineJumpCandidates,
  DEFAULT_MAX_LINE_JUMP_CANDIDATES
} from "../../src/renderer/lineJumpCandidates";

function buildGetLineText(): (line: number) => string {
  return (line) => `line ${line}`;
}

describe("resolveLineJumpCandidates", () => {
  it("returns prefix candidates for '1': 1, 10-19, 100...", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 105,
      maxCandidates: 15,
      getLineText: buildGetLineText()
    });

    expect(candidates.map((c) => c.line)).toEqual([
      1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100, 101, 102, 103
    ]);
  });

  it("returns 12, 120, 121, ... for prefix '12'", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "12",
      lineCount: 1300,
      maxCandidates: 5,
      getLineText: buildGetLineText()
    });

    expect(candidates.map((c) => c.line)).toEqual([12, 120, 121, 122, 123]);
  });

  it("uses '7' as the prefix query for normalized ':007'", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "7",
      lineCount: 705,
      maxCandidates: 4,
      getLineText: buildGetLineText()
    });

    expect(candidates.map((c) => c.line)).toEqual([7, 70, 71, 72]);
  });

  it("uses '1000' as the prefix query for normalized ':1,000'", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1000",
      lineCount: 10005,
      maxCandidates: 3,
      getLineText: buildGetLineText()
    });

    expect(candidates.map((c) => c.line)).toEqual([1000, 10000, 10001]);
  });

  it("does not use contains matching: '1' never matches 21, 31, or 41", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 50,
      maxCandidates: 50,
      getLineText: buildGetLineText()
    });
    const lines = candidates.map((c) => c.line);

    expect(lines).not.toContain(21);
    expect(lines).not.toContain(31);
    expect(lines).not.toContain(41);
  });

  it("puts the exact match first when it exists", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "12",
      lineCount: 130,
      maxCandidates: 5,
      getLineText: buildGetLineText()
    });

    expect(candidates[0]?.line).toBe(12);
  });

  it("does not duplicate the exact match among the additional candidates", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "12",
      lineCount: 130,
      maxCandidates: 20,
      getLineText: buildGetLineText()
    });
    const occurrencesOf12 = candidates.filter((c) => c.line === 12).length;

    expect(occurrencesOf12).toBe(1);
  });

  it("orders additional candidates ascending", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 200,
      maxCandidates: 20,
      getLineText: buildGetLineText()
    });
    const lines = candidates.map((c) => c.line);

    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });

  it("stops the displayed list at the default max of 20 candidates when no override is given", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 100000,
      getLineText: buildGetLineText()
    });

    expect(candidates).toHaveLength(DEFAULT_MAX_LINE_JUMP_CANDIDATES);
    expect(DEFAULT_MAX_LINE_JUMP_CANDIDATES).toBe(20);
  });

  it("stops the displayed list at a custom maxCandidates", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 100000,
      maxCandidates: 3,
      getLineText: buildGetLineText()
    });

    expect(candidates).toHaveLength(3);
  });

  it("returns zero candidates when the exact match and every prefix match exceed lineCount (out of range)", () => {
    const { candidates, totalMatchCount } = resolveLineJumpCandidates({
      prefixQuery: "999",
      lineCount: 100,
      maxCandidates: 20,
      getLineText: buildGetLineText()
    });

    expect(candidates).toEqual([]);
    expect(totalMatchCount).toBe(0);
  });

  it("attaches a preview to every displayed candidate, reusing formatLineJumpLinePreview", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 5,
      maxCandidates: 5,
      getLineText: (line) => (line === 1 ? "   hello world" : "")
    });

    expect(candidates[0]).toEqual({
      line: 1,
      preview: { kind: "text", text: "hello world" }
    });
  });

  it("shows the empty-line preview kind for a blank/whitespace-only candidate line", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 3,
      maxCandidates: 3,
      getLineText: () => "   "
    });

    for (const candidate of candidates) {
      expect(candidate.preview).toEqual({ kind: "empty" });
    }
  });

  it("renders acceptably (all candidates present, correct lines) when multiple candidates are empty lines", () => {
    const { candidates } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 19,
      maxCandidates: 20,
      getLineText: (line) => (line % 2 === 0 ? "" : `text ${line}`)
    });

    expect(candidates.map((c) => c.line)).toEqual([
      1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
    ]);
    // Even lines (10, 12, 14, 16, 18) are blank in this fixture.
    expect(candidates.filter((c) => c.preview.kind === "empty").length).toBe(5);
  });

  it("only calls getLineText for lines that actually become a displayed candidate, never for a rejected line (#148 performance)", () => {
    const getLineText = vi.fn(buildGetLineText());

    resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 200,
      maxCandidates: 5,
      getLineText
    });

    // Candidates for prefix "1" within the first matches: 1, 10, 11, 12, 13.
    expect(getLineText).toHaveBeenCalledTimes(5);
    expect(getLineText.mock.calls.map((call) => call[0])).toEqual([
      1, 10, 11, 12, 13
    ]);
  });

  it("returns no candidates for a prefix query with no exact match and no matching lines", () => {
    const { candidates, totalMatchCount } = resolveLineJumpCandidates({
      prefixQuery: "1",
      lineCount: 0,
      maxCandidates: 20,
      getLineText: buildGetLineText()
    });

    expect(candidates).toEqual([]);
    expect(totalMatchCount).toBe(0);
  });

  describe("totalMatchCount (#148 follow-up: N more candidates footer)", () => {
    it("equals the displayed count when total matches are within the display limit", () => {
      const { candidates, totalMatchCount } = resolveLineJumpCandidates({
        prefixQuery: "12",
        lineCount: 130,
        maxCandidates: 20,
        getLineText: buildGetLineText()
      });

      expect(totalMatchCount).toBe(candidates.length);
    });

    it("exceeds the displayed count when there are more matches than the display limit", () => {
      const { candidates, totalMatchCount } = resolveLineJumpCandidates({
        prefixQuery: "1",
        lineCount: 100000,
        maxCandidates: 20,
        getLineText: buildGetLineText()
      });

      expect(candidates).toHaveLength(20);
      expect(totalMatchCount).toBeGreaterThan(20);
    });

    it("counts the exact match once, matching the displayed list's dedup", () => {
      const { totalMatchCount } = resolveLineJumpCandidates({
        prefixQuery: "12",
        lineCount: 12,
        maxCandidates: 20,
        getLineText: buildGetLineText()
      });

      // Only line 12 exists (lineCount 12) and it is the exact match.
      expect(totalMatchCount).toBe(1);
    });

    it("does not call getLineText for matches beyond the display limit", () => {
      const getLineText = vi.fn(buildGetLineText());

      const { candidates, totalMatchCount } = resolveLineJumpCandidates({
        prefixQuery: "1",
        lineCount: 100000,
        maxCandidates: 20,
        getLineText
      });

      expect(totalMatchCount).toBeGreaterThan(candidates.length);
      // 20 displayed candidates -> exactly 20 getLineText calls, even though
      // totalMatchCount counts many more matches past line 20's worth.
      expect(getLineText).toHaveBeenCalledTimes(20);
    });

    it("still scans to lineCount for an accurate total even once the display limit is reached", () => {
      const { totalMatchCount } = resolveLineJumpCandidates({
        prefixQuery: "1",
        lineCount: 250,
        maxCandidates: 5,
        getLineText: buildGetLineText()
      });

      // Prefix "1" within 1..250: 1, 10-19 (10), 100-199 (100) = 111.
      expect(totalMatchCount).toBe(111);
    });
  });
});
