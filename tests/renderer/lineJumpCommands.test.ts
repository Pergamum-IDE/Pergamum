import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CommandDisabledError,
  CommandRegistry
} from "../../src/shared/commandRegistry";
import { editorCommandIds } from "../../src/shared/commandIds";
import {
  createLineJumpCommandTitles,
  goToLineCommandWhen,
  registerLineJumpCommands
} from "../../src/renderer/lineJumpCommands";

const titles = {
  goToLine: "Go to Line",
  goToLineDescription: "Move the cursor to a line in the active editor"
};
const executionOptions = { source: "commandPalette" } as const;

function registerLineJumpCommandSet(
  registry: CommandRegistry,
  overrides: Partial<{
    canGoToLine: (line: number) => boolean;
    goToLine: (line: number) => void;
  }> = {}
): void {
  registerLineJumpCommands(
    registry,
    {
      canGoToLine: () => true,
      goToLine: () => undefined,
      ...overrides
    },
    titles
  );
}

describe("line jump commands", () => {
  it("registers editor.line.goTo", () => {
    const registry = new CommandRegistry();

    registerLineJumpCommandSet(registry);

    expect(registry.list().map((command) => command.id)).toEqual([
      "editor.line.goTo"
    ]);
  });

  it("is hidden from > command search, since it requires an argument the Palette cannot prompt for", () => {
    const registry = new CommandRegistry();

    registerLineJumpCommandSet(registry);

    expect(registry.get(editorCommandIds.goToLine)?.palette).toEqual({
      visible: false
    });
  });

  it("declares when as editor.kind.markdown, matching Glossary Editor exclusion (#140)", () => {
    expect(goToLineCommandWhen).toEqual({ key: "editor.kind.markdown" });
  });

  it("routes execution to the controller's goToLine with the 1-based line argument", async () => {
    const registry = new CommandRegistry();
    const goToLine = vi.fn();

    registerLineJumpCommandSet(registry, { goToLine });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));

    await registry.execute(editorCommandIds.goToLine, executionOptions, 42);

    expect(goToLine).toHaveBeenCalledWith(42);
  });

  it("reports enablement from the controller's canGoToLine, per candidate line", () => {
    const registry = new CommandRegistry();
    const canGoToLine = vi.fn((line: number) => line <= 10);

    registerLineJumpCommandSet(registry, { canGoToLine });

    expect(registry.isEnabled(editorCommandIds.goToLine, 5)).toBe(true);
    expect(registry.isEnabled(editorCommandIds.goToLine, 11)).toBe(false);
  });

  it("rejects execution via the registry when the live context is not editor.kind.markdown, without running the body", async () => {
    const registry = new CommandRegistry();
    const goToLine = vi.fn();

    registerLineJumpCommandSet(registry, { goToLine });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": false }));

    await expect(
      registry.execute(editorCommandIds.goToLine, executionOptions, 1)
    ).rejects.toBeInstanceOf(CommandDisabledError);
    expect(goToLine).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range target at the registry boundary (command.ignored), even with a markdown editor active", async () => {
    const registry = new CommandRegistry();
    const goToLine = vi.fn();

    registerLineJumpCommandSet(registry, {
      goToLine,
      canGoToLine: (line) => line <= 100
    });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));

    await expect(
      registry.execute(editorCommandIds.goToLine, executionOptions, 99999)
    ).rejects.toBeInstanceOf(CommandDisabledError);
    expect(goToLine).not.toHaveBeenCalled();
  });

  it("emits command.ignored (not command.blocked) for a direct out-of-range execution", async () => {
    const registry = new CommandRegistry();
    const ignored = vi.fn();

    registerLineJumpCommandSet(registry, { canGoToLine: () => false });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));
    registry.setOnCommandIgnored(ignored);

    await expect(
      registry.execute(editorCommandIds.goToLine, executionOptions, 99999)
    ).rejects.toBeInstanceOf(CommandDisabledError);

    expect(ignored).toHaveBeenCalledWith({
      commandId: "editor.line.goTo",
      source: "commandPalette"
    });
  });

  it("emits command.invoked for a successful execution", async () => {
    const registry = new CommandRegistry();
    const invoked = vi.fn();

    registerLineJumpCommandSet(registry);
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));
    registry.setOnCommandInvoked(invoked);

    await registry.execute(editorCommandIds.goToLine, executionOptions, 1);

    expect(invoked).toHaveBeenCalledWith({
      commandId: "editor.line.goTo",
      source: "commandPalette"
    });
  });

  it("creates localized command titles from command i18n keys", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createLineJumpCommandTitles(translate)).toEqual({
      goToLine: "translated:command.editor.line.goTo",
      goToLineDescription: "translated:command.editor.line.goTo.description"
    });
  });

  it("keeps the command definition independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/lineJumpCommands.ts", "utf8");

    expect(source).not.toContain("defineCommandId(");
    expect(source).not.toContain('from "react"');
    expect(source).not.toContain("window.");
    expect(source).not.toContain("JSX");
  });
});
