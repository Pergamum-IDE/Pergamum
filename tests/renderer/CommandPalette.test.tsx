import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandRegistry, defineCommandId } from "../../src/shared/commandRegistry";
import type { CommandContext } from "../../src/shared/commandEnablement";
import type { Translate } from "../../src/shared/i18n";
import { CommandPalette } from "../../src/renderer/CommandPalette";

const translate: Translate = (key) => key;
const notComposing = () => false;
const noop = () => undefined;

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register({
    id: defineCommandId("test.command.save"),
    title: "保存",
    description: "現在の文書を保存",
    canonicalLabel: "Save Document",
    execute: () => undefined,
    isEnabled: () => true
  });
  registry.register({
    id: defineCommandId("test.command.disabled"),
    title: "Disabled Command",
    execute: () => undefined,
    isEnabled: () => false
  });
  registry.register({
    id: defineCommandId("test.command.fallback"),
    title: "Fallback Only",
    execute: () => undefined
  });

  return registry;
}

function buildWhenGatedRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register({
    id: defineCommandId("test.command.whenGated"),
    title: "When Gated",
    execute: () => undefined,
    when: { key: "editor.isDirty" }
  });

  return registry;
}

function renderPalette(overrides: {
  registry?: CommandRegistry;
  commandContext?: CommandContext;
} = {}): string {
  return renderToStaticMarkup(
    React.createElement(CommandPalette, {
      commandRegistry: overrides.registry ?? buildRegistry(),
      translate,
      isComposing: notComposing,
      commandContext: overrides.commandContext ?? {},
      onExecuteCommand: noop,
      onBlockedCommand: noop,
      onClose: noop
    })
  );
}

describe("CommandPalette", () => {
  it("initializes the search input to '>'", () => {
    const markup = renderPalette();

    expect(markup).toContain('value="&gt;"');
  });

  it("renders a two-line item using description/canonicalLabel with label/id fallback", () => {
    const markup = renderPalette();

    expect(markup).toContain("現在の文書を保存");
    expect(markup).toContain("Save Document");
    expect(markup).toContain("Fallback Only");
    expect(markup).toContain("test.command.fallback");
  });

  it("marks disabled commands with the disabled class and aria-disabled", () => {
    const markup = renderPalette();

    expect(markup).toContain("commandPaletteItemDisabled");
    expect(markup).toContain('aria-disabled="true"');
  });

  it("renders as a labeled dialog with a search input and a close button", () => {
    const markup = renderPalette();

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("commandPaletteInput");
    expect(markup).toContain("commandPaletteCloseButton");
  });

  it("displays a when-gated command as disabled when the snapshot says it is false", () => {
    const markup = renderPalette({
      registry: buildWhenGatedRegistry(),
      commandContext: { "editor.isDirty": false }
    });

    expect(markup).toContain("When Gated");
    expect(markup).toContain("commandPaletteItemDisabled");
    expect(markup).toContain('aria-disabled="true"');
  });

  it("displays a when-gated command as enabled when the snapshot says it is true", () => {
    const markup = renderPalette({
      registry: buildWhenGatedRegistry(),
      commandContext: { "editor.isDirty": true }
    });

    expect(markup).toContain("When Gated");
    expect(markup).not.toContain("commandPaletteItemDisabled");
    expect(markup).toContain('aria-disabled="false"');
  });
});

describe("CommandPalette snapshot and UI-level block wiring", () => {
  const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

  it("captures commandContext once via a lazy useState initializer, not the live prop", () => {
    expect(source).toContain(
      "const [snapshot] = useState<CommandContext>(() => commandContext);"
    );

    const afterCapture = source.slice(
      source.indexOf("const [snapshot] = useState<CommandContext>")
    );

    // Every entries computation should read the captured snapshot, not the
    // (potentially stale-by-design) live commandContext prop directly.
    expect(afterCapture.match(/listCommandPaletteEntries\(/g)?.length).toBe(3);
    expect(
      afterCapture.match(/listCommandPaletteEntries\(commandRegistry, snapshot\)/g)
        ?.length
    ).toBe(3);
  });

  it("blocks a disabled entry at the UI layer on click without executing it", () => {
    const startIndex = source.indexOf("function executeEntryAt(");
    const endIndex = source.indexOf("function handleKeyDown(");
    const body = source.slice(startIndex, endIndex);

    expect(body).toContain("if (!entry.enabled) {");
    expect(body.indexOf("onBlockedCommand(entry.id)")).toBeLessThan(
      body.indexOf("onExecuteCommand(entry.id)")
    );
  });

  it("blocks a disabled entry at the UI layer on Enter without executing it", () => {
    const startIndex = source.indexOf('case "Enter": {');
    const endIndex = source.indexOf("default:");
    const body = source.slice(startIndex, endIndex);

    expect(body).toContain("resolveCommandPaletteEnterSelection(");
    expect(body).toContain("if (!entry.enabled) {");
    expect(body.indexOf("onBlockedCommand(entry.id)")).toBeLessThan(
      body.indexOf("onExecuteCommand(entry.id)")
    );
  });
});
