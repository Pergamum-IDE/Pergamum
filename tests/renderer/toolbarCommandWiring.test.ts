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

  it("logs command.ignored with disabled_command before returning from a disabled command", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");
    const guardIndex = source.indexOf(
      "if (!commandRegistry.isEnabled(commandId, ...args)) {"
    );
    const executeIndex = source.indexOf(
      "void commandRegistry.execute(commandId, ...args)"
    );

    expect(guardIndex).toBeGreaterThan(-1);
    expect(executeIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(executeIndex);

    const guardBlock = source.slice(guardIndex, executeIndex);

    expect(guardBlock).toContain('event: "command.ignored"');
    expect(guardBlock).toContain('level: "debug"');
    expect(guardBlock).toContain("commandId: String(commandId)");
    expect(guardBlock).toContain('result: "ignored"');
    expect(guardBlock).toContain('reason: "disabled_command"');
    expect(guardBlock.indexOf('event: "command.ignored"')).toBeLessThan(
      guardBlock.indexOf("return;")
    );
    expect(source).not.toContain('event: "command.succeeded"');
  });

  it("keeps executeUiCommand free of raw key, selection, clipboard, and content logging", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");
    const startIndex = source.indexOf("function executeUiCommand<");
    const endIndex = source.indexOf(
      "executeUiCommandRef.current = (commandId) => {"
    );

    expect(startIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(startIndex);

    const executeUiCommandSource = source.slice(startIndex, endIndex);

    expect(executeUiCommandSource).not.toContain("KeyboardEvent");
    expect(executeUiCommandSource).not.toContain("selectedText");
    expect(executeUiCommandSource).not.toContain("selectionText");
    expect(executeUiCommandSource).not.toContain("clipboard");
    expect(executeUiCommandSource).not.toContain("surface");
    expect(executeUiCommandSource).not.toContain("description");
    expect(executeUiCommandSource).not.toContain("innerText");
    expect(executeUiCommandSource).not.toContain("textContent");
    expect(executeUiCommandSource).not.toContain(".value");
    expect(executeUiCommandSource).not.toContain("path");
  });

  it("uses ref delegation for stateful Toolbar commands", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("openProjectCommandRef.current()");
    expect(source).toContain("openMarkdownDocumentCommandRef.current()");
    expect(source).toContain("saveCurrentDocumentCommandRef.current()");
    expect(source).toContain("toggleRecentProjectsCommandRef.current()");
  });
});
