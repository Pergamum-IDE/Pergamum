import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("line jump wiring (#140)", () => {
  const source = readFileSync("src/renderer/App.tsx", "utf8");

  it("registers the line jump command", () => {
    expect(source).toContain("registerLineJumpCommands(");
    expect(source).toContain("canGoToLine: (line) => canGoToLineCommandRef.current(line)");
    expect(source).toContain("goToLine: (line) => goToLineCommandRef.current(line)");
  });

  it("resolves canGoToLine/goToLine from the live current editor, not a captured render-time closure", () => {
    const start = source.indexOf("canGoToLineCommandRef.current = (line) => {");
    const end = source.indexOf("async function activateProjectDocument(");
    const body = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    // All three refs (canGoToLine, goToLine, previewLineText) are
    // reassigned on every render (same pattern as
    // canSaveCurrentDocumentCommandRef), so command execution and preview
    // display always see the editor active at activation time, not a stale
    // Palette-open-time snapshot (#128 current-editor requirement).
    expect(body).toContain('if (currentEditor.kind !== "markdown") {');
    expect(body.match(/currentEditor\.kind !== "markdown"/g)?.length).toBe(3);
  });

  it("does not jump directly into editor internals: it computes an offset and reuses the existing pendingMarkdownSelection channel", () => {
    const start = source.indexOf("goToLineCommandRef.current = (line) => {");
    const end = source.indexOf(
      "async function activateProjectDocument("
    );
    const body = source.slice(start, end);

    expect(body).toContain("documentLineStartOffset(");
    expect(body).toContain(
      "setPendingMarkdownSelection({ start: offset, end: offset });"
    );
    // Reuses the same "\n"-only content used elsewhere for this document,
    // and does not duplicate that logic with a different splitting rule.
    expect(body).toContain("currentDocumentContent(currentEditor.document)");
  });

  it("does not add a new editor-open/navigation-history entry for line jump (#140: in-editor cursor movement only)", () => {
    const start = source.indexOf("goToLineCommandRef.current = (line) => {");
    const end = source.indexOf("async function activateProjectDocument(");
    const body = source.slice(start, end);

    expect(body).not.toContain("editorNavigationRef");
    expect(body).not.toContain(".openEditor(");
  });

  it("wires the line preview resolver to the same live current-editor read, reusing documentLineText (#140 polish)", () => {
    const start = source.indexOf("previewLineTextCommandRef.current = (line) => {");
    const end = source.indexOf("async function activateProjectDocument(");
    const body = source.slice(start, end);
    const componentIndex = source.indexOf("<CommandPalette");
    const closeIndex = source.indexOf("/>", componentIndex);
    const propsBlock = source.slice(componentIndex, closeIndex);

    expect(start).toBeGreaterThan(-1);
    expect(body).toContain('if (currentEditor.kind !== "markdown") {');
    expect(body).toContain("documentLineText(");
    expect(body).toContain("currentDocumentContent(currentEditor.document)");
    expect(propsBlock).toContain(
      "resolveLineJumpPreviewLine={(line) =>\n            previewLineTextCommandRef.current(line)\n          }"
    );
  });

  it("passes command arguments through onExecuteCommand to executeUiCommand, so Palette callers can execute commands that take arguments", () => {
    const componentIndex = source.indexOf("<CommandPalette");
    const closeIndex = source.indexOf("/>", componentIndex);
    const propsBlock = source.slice(componentIndex, closeIndex);

    expect(propsBlock).toContain("onExecuteCommand={(commandId, ...args) => {");
    expect(propsBlock).toContain(
      'executeUiCommand(commandId, { source: "commandPalette" }, ...args);'
    );
  });
});
