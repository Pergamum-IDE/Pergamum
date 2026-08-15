import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("toolbar command wiring", () => {
  it("connects Toolbar primary actions through Command Registry execution", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain(
      "executeUiCommand(applicationCommandIds.openProject)"
    );
    expect(source).toContain(
      "executeUiCommand(editorCommandIds.openMarkdownDocument)"
    );
    expect(source).toContain("executeUiCommand(editorCommandIds.saveDocument)");
    expect(source).toContain(
      "executeUiCommand(applicationCommandIds.toggleRecentProjects)"
    );
  });

  it("keeps Toolbar Save disabled state aligned with command enablement", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain(
      "disabled={!commandRegistry.isEnabled(editorCommandIds.saveDocument)}"
    );
    expect(source).toContain(
      "canSaveCurrentDocumentCommandRef.current = () => canSave"
    );
  });

  it("does not execute disabled UI commands", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain(
      "if (!commandRegistry.isEnabled(commandId, ...args)) {"
    );
  });

  it("uses ref delegation for stateful Toolbar commands", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("openProjectCommandRef.current()");
    expect(source).toContain("openMarkdownDocumentCommandRef.current()");
    expect(source).toContain("saveCurrentDocumentCommandRef.current()");
    expect(source).toContain("toggleRecentProjectsCommandRef.current()");
  });
});
