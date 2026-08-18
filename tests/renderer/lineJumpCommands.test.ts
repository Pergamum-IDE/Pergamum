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
    goToLine: (line: number) => void;
  }> = {}
): void {
  registerLineJumpCommands(
    registry,
    {
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

  it("declares no isEnabled: range is not a registry enablement gate (#148)", () => {
    const registry = new CommandRegistry();

    registerLineJumpCommandSet(registry);

    expect(registry.get(editorCommandIds.goToLine)?.isEnabled).toBeUndefined();
  });

  it("routes execution to the controller's goToLine with the 1-based line argument", async () => {
    const registry = new CommandRegistry();
    const goToLine = vi.fn();

    registerLineJumpCommandSet(registry, { goToLine });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));

    await registry.execute(editorCommandIds.goToLine, executionOptions, 42);

    expect(goToLine).toHaveBeenCalledWith(42);
  });

  it("is enabled for any candidate line number as long as editor.kind.markdown holds — range is not checked here", () => {
    const registry = new CommandRegistry();

    registerLineJumpCommandSet(registry);

    expect(registry.isEnabled(editorCommandIds.goToLine, 5)).toBe(true);
    expect(registry.isEnabled(editorCommandIds.goToLine, 99999999)).toBe(true);
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

  it("emits command.ignored (not command.invoked) when editor.kind.markdown is false, regardless of the line argument", async () => {
    const registry = new CommandRegistry();
    const ignored = vi.fn();
    const invoked = vi.fn();

    registerLineJumpCommandSet(registry);
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": false }));
    registry.setOnCommandIgnored(ignored);
    registry.setOnCommandInvoked(invoked);

    await expect(
      registry.execute(editorCommandIds.goToLine, executionOptions, 1)
    ).rejects.toBeInstanceOf(CommandDisabledError);

    expect(ignored).toHaveBeenCalledWith({
      commandId: "editor.line.goTo",
      source: "commandPalette"
    });
    expect(invoked).not.toHaveBeenCalled();
  });

  it("does NOT reject an out-of-range target at the registry boundary — it reaches the body and emits command.invoked (#148)", async () => {
    const registry = new CommandRegistry();
    const goToLine = vi.fn();
    const invoked = vi.fn();
    const ignored = vi.fn();

    registerLineJumpCommandSet(registry, { goToLine });
    registry.setCommandContextProvider(() => ({ "editor.kind.markdown": true }));
    registry.setOnCommandInvoked(invoked);
    registry.setOnCommandIgnored(ignored);

    await registry.execute(editorCommandIds.goToLine, executionOptions, 99999);

    // Range validation is the command body's job (the controller's
    // goToLine, wired in App.tsx to silently no-op past the document's line
    // count) — the registry boundary itself does not know or care whether
    // 99999 is in range, so it is reached and invoked normally.
    expect(goToLine).toHaveBeenCalledWith(99999);
    expect(invoked).toHaveBeenCalledWith({
      commandId: "editor.line.goTo",
      source: "commandPalette"
    });
    expect(ignored).not.toHaveBeenCalled();
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
