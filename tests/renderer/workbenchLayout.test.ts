import { describe, expect, it } from "vitest";
import {
  MARKDOWN_EDITOR_MIN_WIDTH,
  MARKDOWN_PREVIEW_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampMarkdownEditorPreviewRatio,
  clampSidebarWidth,
  resolveActiveActivityMode,
  resolveSidebarToggle
} from "../../src/renderer/workbenchLayout";

describe("clampSidebarWidth", () => {
  it("clamps below the minimum up to SIDEBAR_MIN_WIDTH", () => {
    expect(clampSidebarWidth(50)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("clamps above the maximum down to SIDEBAR_MAX_WIDTH", () => {
    expect(clampSidebarWidth(900)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("passes values already within range through unchanged", () => {
    expect(clampSidebarWidth(300)).toBe(300);
  });

  it("caps the width so the editor area keeps a minimum share of a narrow window", () => {
    const clamped = clampSidebarWidth(400, 500);

    expect(clamped).toBeLessThan(400);
    expect(clamped).toBeGreaterThanOrEqual(SIDEBAR_MIN_WIDTH);
  });

  it("never drops below SIDEBAR_MIN_WIDTH even for a very narrow window", () => {
    expect(clampSidebarWidth(300, 200)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("does not restrict the width when availableWidth is generous", () => {
    expect(clampSidebarWidth(300, 2000)).toBe(300);
  });
});

describe("clampMarkdownEditorPreviewRatio", () => {
  it("clamps below 0 up to 0", () => {
    expect(clampMarkdownEditorPreviewRatio(-1)).toBe(0);
  });

  it("clamps above 1 down to 1", () => {
    expect(clampMarkdownEditorPreviewRatio(2)).toBe(1);
  });

  it("passes values already within range through unchanged when no container width is given", () => {
    expect(clampMarkdownEditorPreviewRatio(0.3)).toBe(0.3);
  });

  it("enforces the editor minimum width against a container", () => {
    const containerWidth = 1000;
    const tinyRatio = 0.05;
    const clamped = clampMarkdownEditorPreviewRatio(tinyRatio, containerWidth);

    expect(clamped * containerWidth).toBeGreaterThanOrEqual(
      MARKDOWN_EDITOR_MIN_WIDTH - 1e-9
    );
  });

  it("enforces the preview minimum width against a container", () => {
    const containerWidth = 1000;
    const hugeRatio = 0.95;
    const clamped = clampMarkdownEditorPreviewRatio(hugeRatio, containerWidth);

    expect((1 - clamped) * containerWidth).toBeGreaterThanOrEqual(
      MARKDOWN_PREVIEW_MIN_WIDTH - 1e-9
    );
  });

  it("prioritizes the minimum widths over the stored ratio when the container is too narrow for both", () => {
    const containerWidth =
      MARKDOWN_EDITOR_MIN_WIDTH + MARKDOWN_PREVIEW_MIN_WIDTH - 100;
    const clamped = clampMarkdownEditorPreviewRatio(0.5, containerWidth);

    expect(clamped).toBeCloseTo(
      MARKDOWN_EDITOR_MIN_WIDTH /
        (MARKDOWN_EDITOR_MIN_WIDTH + MARKDOWN_PREVIEW_MIN_WIDTH)
    );
  });

  it("ignores a non-positive container width", () => {
    expect(clampMarkdownEditorPreviewRatio(0.5, 0)).toBe(0.5);
  });
});

describe("resolveSidebarToggle", () => {
  it("collapses when clicking the currently active, expanded mode", () => {
    expect(resolveSidebarToggle("files", "files", false)).toEqual({
      collapsed: true,
      mode: "files"
    });
  });

  it("restores when clicking the currently active, collapsed mode", () => {
    expect(resolveSidebarToggle("files", "files", true)).toEqual({
      collapsed: false,
      mode: "files"
    });
  });

  it("restores and switches mode when clicking a different mode while collapsed", () => {
    expect(resolveSidebarToggle("files", "glossary", true)).toEqual({
      collapsed: false,
      mode: "glossary"
    });
  });

  it("switches mode without collapsing when clicking a different mode while expanded", () => {
    expect(resolveSidebarToggle("files", "search", false)).toEqual({
      collapsed: false,
      mode: "search"
    });
  });
});

describe("resolveActiveActivityMode", () => {
  it("shows the current mode as active when a project is open and the Sidebar is expanded", () => {
    expect(resolveActiveActivityMode("glossary", false, true)).toBe(
      "glossary"
    );
  });

  it("shows no active mode while the Sidebar is collapsed", () => {
    expect(resolveActiveActivityMode("glossary", true, true)).toBeNull();
  });

  it("shows no active mode when no project is open", () => {
    expect(resolveActiveActivityMode("files", false, false)).toBeNull();
  });

  it("shows no active mode when collapsed and no project is open", () => {
    expect(resolveActiveActivityMode("files", true, false)).toBeNull();
  });
});
