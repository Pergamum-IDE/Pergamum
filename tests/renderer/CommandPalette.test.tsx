import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommandRegistry, defineCommandId } from "../../src/shared/commandRegistry";
import type { CommandContext } from "../../src/shared/commandEnablement";
import { t, type Translate } from "../../src/shared/i18n";
import { enTranslations } from "../../src/shared/i18n/en";
import { jaTranslations } from "../../src/shared/i18n/ja";
import {
  CommandPalette,
  CommandPaletteHighlightedText,
  commandPaletteItemClassName,
  resolveCommandPaletteFooterModel,
  scrollCommandPaletteSelectionIntoView
} from "../../src/renderer/CommandPalette";
import {
  filterCommandPaletteEntries,
  type CommandPaletteEntry
} from "../../src/renderer/commandPaletteEntries";

const translate: Translate = (key) => key;
const realTranslateEn: Translate = (key, values) => t("en", key, values);
const realTranslateJa: Translate = (key, values) => t("ja", key, values);
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
  translate?: Translate;
  initialInputValue?: string;
} = {}): string {
  return renderToStaticMarkup(
    React.createElement(CommandPalette, {
      commandRegistry: overrides.registry ?? buildRegistry(),
      translate: overrides.translate ?? translate,
      isComposing: notComposing,
      commandContext: overrides.commandContext ?? {},
      initialInputValue: overrides.initialInputValue,
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

  it("renders a two-line item using description/canonicalLabel with title/id fallback", () => {
    const markup = renderPalette();

    expect(markup).toContain("現在の文書を保存");
    expect(markup).toContain("Save Document");
    expect(markup).toContain("Fallback Only");
    expect(markup).toContain("test.command.fallback");
  });

  it("renders the empty result state in the result list area", () => {
    const markup = renderPalette({
      registry: new CommandRegistry()
    });

    expect(markup).toContain("commandPaletteList");
    expect(markup).toContain("commandPaletteEmpty");
    expect(markup).toContain("commandPalette.noResults");
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

  it("uses the original primary label as the result accessible name", () => {
    const markup = renderPalette();

    expect(markup).toContain('aria-label="Save Document"');
    expect(markup).not.toContain('aria-label="現在の文書を保存"');
  });

  it("keeps the selected disabled item visually distinct", () => {
    expect(commandPaletteItemClassName(true, false)).toBe(
      "commandPaletteItem commandPaletteItemSelected commandPaletteItemDisabled"
    );
  });

  it("keeps the selected item visible with nearest scrolling", () => {
    const scrollIntoView = vi.fn();

    scrollCommandPaletteSelectionIntoView({ scrollIntoView });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("does not scroll when the result list has no selected item", () => {
    expect(() => scrollCommandPaletteSelectionIntoView(null)).not.toThrow();
  });

  it("renders fixed footer hints and the command-mode search hint, without a result count, for the default empty query", () => {
    const markup = renderPalette();

    expect(markup).toContain("commandPaletteFooter");
    expect(markup).toContain("commandPalette.footer.selectHint");
    expect(markup).toContain("commandPalette.footer.runHint");
    expect(markup).toContain("commandPalette.footer.closeHint");
    expect(markup).toContain("commandPalette.footer.searchHint");
    expect(markup).not.toContain("commandPalette.footer.results");
  });

  it("shows the real English/Japanese search hint text for the default > with an empty query", () => {
    expect(renderPalette({ translate: realTranslateEn })).toContain(
      "Search commands"
    );
    expect(renderPalette({ translate: realTranslateJa })).toContain(
      "コマンドを検索します"
    );
  });

  it("does not show the command-mode search hint for a fully empty input, and renders the native placeholder instead", () => {
    const markup = renderPalette({
      translate: realTranslateEn,
      initialInputValue: ""
    });

    expect(markup).toContain('<div class="commandPaletteFooterStatus"></div>');
    expect(markup).toContain('placeholder="Type &gt; for commands"');
  });

  it("renders '1 result', not '1 results', for a real English query with exactly one match (dogfood regression)", () => {
    // Renders the actual CommandPalette JSX tree end-to-end (real registry
    // filtering, real resolveCommandPaletteFooterModel call, real translate
    // bound to the real en.ts dictionary) rather than only asserting on the
    // pure footer-model function, since a wiring bug between statusKey/
    // statusValues and the rendered JSX would not show up in a model-only
    // test.
    const markup = renderPalette({
      translate: realTranslateEn,
      initialInputValue: ">fallback"
    });

    expect(markup).toContain("1 result");
    expect(markup).not.toContain("1 results");
  });

  it("renders '{count} results' for a real English query with multiple matches", () => {
    const markup = renderPalette({
      translate: realTranslateEn,
      initialInputValue: ">test.command"
    });

    expect(markup).toContain("3 results");
    expect(markup).not.toContain("1 results");
    expect(markup).not.toContain("1 result");
  });

  it("renders the Japanese counter form for a real one-result query", () => {
    const markup = renderPalette({
      translate: realTranslateJa,
      initialInputValue: ">fallback"
    });

    expect(markup).toContain("1件の結果");
  });

  it("does not hard-code either plural results key in CommandPalette.tsx, and passes statusValues through to translate", () => {
    const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

    expect(source).not.toContain("commandPalette.footer.results.other");
    expect(source).not.toContain("commandPalette.footer.results.one");
    expect(source).toContain("translate(footer.statusKey, footer.statusValues)");
  });

  it("uses compact key-only footer hints that do not read like clickable actions", () => {
    expect(enTranslations["commandPalette.footer.selectHint"]).toBe("↑↓");
    expect(enTranslations["commandPalette.footer.runHint"]).toBe("Enter");
    expect(enTranslations["commandPalette.footer.closeHint"]).toBe("Esc");
    expect(jaTranslations["commandPalette.footer.selectHint"]).toBe("↑↓");
    expect(jaTranslations["commandPalette.footer.runHint"]).toBe("Enter");
    expect(jaTranslations["commandPalette.footer.closeHint"]).toBe("Esc");
  });

  it("uses adaptive top-anchored height while keeping large result sets scrollable", () => {
    const styles = readFileSync("src/renderer/styles.css", "utf8");

    expect(styles).toContain(".commandPaletteBackdrop");
    expect(styles).toContain("align-items: flex-start;");
    expect(styles).toContain(".commandPalette {\n  display: flex;");
    expect(styles).toContain("width: min(35rem, calc(100vw - 2rem));");
    expect(styles).toContain("max-height: min(30rem, calc(100vh - 24vh));");
    expect(styles).toContain("border-radius: 0.5rem;");
    expect(styles).toContain(".commandPaletteInputRow {\n  display: flex;\n  flex: 0 0 auto;");
    expect(styles).toContain("padding: 0.625rem 0.75rem;");
    expect(styles).toContain(".commandPaletteList {\n  flex: 0 1 auto;");
    expect(styles).toContain("overflow-y: auto;");
    expect(styles).toContain("padding: 0.375rem;");
    expect(styles).toContain(".commandPaletteFooter {\n  display: flex;\n  flex: 0 0 auto;");
    expect(styles).toContain("gap: 1em;");
    expect(styles).toContain(".commandPaletteEmpty {\n  display: flex;\n  min-height: 6rem;");
    expect(styles).toContain(".commandPaletteItem {\n  display: flex;");
    expect(styles).toContain("gap: 0.15em;");
    expect(styles).toContain("min-height: 3rem;");
    expect(styles).toContain("padding: 0.52em 0.6em;");
    expect(styles).toContain("box-shadow: inset 0.1875rem 0 0 #c9d3dc;");
    expect(styles).toContain("border-radius: 0.125em;");
    expect(styles).toContain("padding: 0 0.08em;");
  });
});

describe("CommandPalette highlighting and footer model", () => {
  const entries: CommandPaletteEntry[] = [
    {
      id: defineCommandId("test.command.save"),
      title: "Save Document",
      description: "Write the current editor to disk",
      enabled: true
    },
    {
      id: defineCommandId("test.command.disabled"),
      title: "Disabled Command",
      enabled: false
    }
  ];

  it("renders no highlight markup when there are no matched ranges", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CommandPaletteHighlightedText, {
        text: "Save Document",
        ranges: []
      })
    );

    expect(markup).toBe("Save Document");
    expect(markup).not.toContain("<mark");
  });

  it("safely renders highlighted text without raw HTML injection", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CommandPaletteHighlightedText, {
        text: "<script>Save</script>",
        ranges: [{ start: 8, end: 12 }]
      })
    );

    expect(markup).toContain("&lt;script&gt;");
    expect(markup).toContain("<mark");
    expect(markup).not.toContain("<script>");
  });

  it("highlights matched ranges from the filtering result in every visible matched field", () => {
    const result = filterCommandPaletteEntries(entries, "document")[0];
    const primaryMarkup = renderToStaticMarkup(
      React.createElement(CommandPaletteHighlightedText, {
        text: result.primary.text,
        ranges: result.primary.ranges
      })
    );

    expect(result.primary).toEqual({
      field: "title",
      text: "Save Document",
      ranges: [{ start: 5, end: 13 }]
    });
    expect(primaryMarkup).toContain(
      'Save <mark class="commandPaletteMatch">Document</mark>'
    );
  });

  it("shows result count only for command queries in the footer model", () => {
    const results = filterCommandPaletteEntries(entries, "command");

    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "command",
        inputValue: ">command",
        entries: results,
        selectedIndex: 0
      })
    ).toEqual({
      statusKey: "commandPalette.footer.results.other",
      statusValues: { count: 2 },
      canRunSelected: true
    });
    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "",
        inputValue: "",
        entries: results,
        selectedIndex: 0
      }).statusKey
    ).toBeNull();
  });

  it("uses the singular one form when exactly one result matches (#129 i18n follow-up)", () => {
    const results = filterCommandPaletteEntries(entries, "save");

    expect(results).toHaveLength(1);
    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "save",
        inputValue: ">save",
        entries: results,
        selectedIndex: 0
      })
    ).toEqual({
      statusKey: "commandPalette.footer.results.one",
      statusValues: { count: 1 },
      canRunSelected: true
    });
  });

  it("uses a disabled status and dims Enter when the selected item is disabled", () => {
    const results = filterCommandPaletteEntries(entries, "disabled");

    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "disabled",
        inputValue: ">disabled",
        entries: results,
        selectedIndex: 0
      })
    ).toEqual({
      statusKey: "commandPalette.footer.disabled",
      canRunSelected: false
    });
  });

  it("shows the command-mode search hint for an empty query once the > prefix has been typed", () => {
    const results = filterCommandPaletteEntries(entries, "");

    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "",
        inputValue: ">",
        entries: results,
        selectedIndex: 0
      })
    ).toEqual({
      statusKey: "commandPalette.footer.searchHint",
      canRunSelected: true
    });
  });

  it("does not show the search hint for a fully empty input (native placeholder covers that state instead)", () => {
    const results = filterCommandPaletteEntries(entries, "");

    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "",
        inputValue: "",
        entries: results,
        selectedIndex: 0
      }).statusKey
    ).toBeNull();
  });

  it("prioritizes the disabled selected command message over the command-mode search hint", () => {
    const results = filterCommandPaletteEntries(entries, "");

    expect(
      resolveCommandPaletteFooterModel({
        mode: "command",
        query: "",
        inputValue: ">",
        entries: results,
        selectedIndex: 1
      })
    ).toEqual({
      statusKey: "commandPalette.footer.disabled",
      canRunSelected: false
    });
  });
});

describe("CommandPalette snapshot and UI-level block wiring", () => {
  const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

  it("does not introduce new Quick Access prefix behavior (placeholder/hint are empty-state text only, #129)", () => {
    const resolverSource = readFileSync(
      "src/renderer/quickAccessPrefixResolver.ts",
      "utf8"
    );

    // The prefix resolver itself must be untouched by this issue.
    expect(resolverSource).toContain('new Set([">", "＞"])');
    expect(resolverSource).toContain('new Set(["#", "＃"])');
    expect(resolverSource).toContain('new Set(["/", "／"])');
    expect(resolverSource).not.toContain('":"');
    expect(resolverSource).not.toContain('"@"');

    // CommandPalette.tsx must not add its own prefix handling — the
    // placeholder and search hint are plain empty-state copy, not a new
    // mode dispatched by resolveQuickAccessInput.
    expect(source).not.toContain("lineJump");
    expect(source).not.toContain("symbolJump");
    expect(source).not.toContain('":"');
    expect(source).not.toContain('case "@"');
  });

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
