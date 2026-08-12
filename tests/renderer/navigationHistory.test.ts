import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createUntitledEditorId, editorIdEquals } from "../../src/shared/editorId";
import { NavigationHistory } from "../../src/renderer/navigationHistory";

const editorA = createUntitledEditorId(1);
const editorB = createUntitledEditorId(2);
const editorC = createUntitledEditorId(3);
const editorD = createUntitledEditorId(4);

function expectEntries(
  history: NavigationHistory,
  expectedEntries: readonly typeof editorA[],
  expectedCurrentIndex: number
): void {
  const snapshot = history.snapshot();

  expect(snapshot.currentIndex).toBe(expectedCurrentIndex);
  expect(snapshot.entries.length).toBe(expectedEntries.length);

  for (const [index, expectedEntry] of expectedEntries.entries()) {
    expect(editorIdEquals(snapshot.entries[index], expectedEntry)).toBe(true);
  }
}

describe("NavigationHistory", () => {
  it("keeps Navigation History independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/navigationHistory.ts", "utf8");

    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });

  it("records normal editor transitions", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorB);

    expectEntries(history, [editorA, editorB], 1);
    expect(editorIdEquals(history.current() ?? editorA, editorB)).toBe(true);
  });

  it("does not record duplicate adjacent transitions to the same editor", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorA);

    expectEntries(history, [editorA], 0);
  });

  it("moves back and forward without creating history entries", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorB);

    const backCandidate = history.candidate("back");
    expect(backCandidate).not.toBeNull();
    expect(history.moveTo(backCandidate!)).toBe(true);
    expectEntries(history, [editorA, editorB], 0);

    const forwardCandidate = history.candidate("forward");
    expect(forwardCandidate).not.toBeNull();
    expect(history.moveTo(forwardCandidate!)).toBe(true);
    expectEntries(history, [editorA, editorB], 1);
  });

  it("discards forward history after a normal transition following Back", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorB);
    history.record(editorC);

    const backCandidate = history.candidate("back");
    expect(backCandidate).not.toBeNull();
    history.moveTo(backCandidate!);

    history.record(editorD);

    expectEntries(history, [editorA, editorB, editorD], 2);
  });

  it("invalidates every matching EditorId lazily", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorB);
    history.record(editorA);
    history.record(editorC);

    history.invalidate(editorA);

    expectEntries(history, [editorB, editorC], 1);
  });

  it("resets all history state", () => {
    const history = new NavigationHistory();

    history.record(editorA);
    history.record(editorB);
    history.reset();

    expectEntries(history, [], -1);
    expect(history.current()).toBeNull();
    expect(history.candidate("back")).toBeNull();
    expect(history.candidate("forward")).toBeNull();
  });
});
