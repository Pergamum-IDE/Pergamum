import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandRegistry, defineCommandId } from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import { CommandPalette } from "../../src/renderer/CommandPalette";

const translate: Translate = (key) => key;
const notComposing = () => false;

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

function renderPalette(): string {
  return renderToStaticMarkup(
    React.createElement(CommandPalette, {
      commandRegistry: buildRegistry(),
      translate,
      isComposing: notComposing,
      onExecuteCommand: () => undefined,
      onClose: () => undefined
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
});
