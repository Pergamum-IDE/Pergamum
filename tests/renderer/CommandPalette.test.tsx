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
  resolveCommandPaletteEnterSelection,
  type CommandPaletteEntry
} from "../../src/renderer/commandPaletteEntries";
import { registerLineJumpCommands } from "../../src/renderer/lineJumpCommands";

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
  onExecuteCommand?: (commandId: unknown, ...args: readonly unknown[]) => void;
  onBlockedCommand?: (commandId: unknown) => void;
  resolveLineJumpPreviewLine?: (line: number) => string | null;
} = {}): string {
  return renderToStaticMarkup(
    React.createElement(CommandPalette, {
      commandRegistry: overrides.registry ?? buildRegistry(),
      translate: overrides.translate ?? translate,
      isComposing: notComposing,
      commandContext: overrides.commandContext ?? {},
      initialInputValue: overrides.initialInputValue,
      onExecuteCommand: overrides.onExecuteCommand ?? noop,
      onBlockedCommand: overrides.onBlockedCommand ?? noop,
      onClose: noop,
      resolveLineJumpPreviewLine: overrides.resolveLineJumpPreviewLine
    })
  );
}

function buildLineJumpRegistry(canGoToLine: (line: number) => boolean): CommandRegistry {
  const registry = new CommandRegistry();

  registerLineJumpCommands(
    registry,
    { canGoToLine, goToLine: () => undefined },
    {
      goToLine: "Go to Line",
      goToLineDescription: "Move the cursor to a line in the active editor"
    }
  );

  return registry;
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

  it("shows a null status and canRunSelected: false for every reserved mode, regardless of entries/selection (#145)", () => {
    const results = filterCommandPaletteEntries(entries, "");

    for (const mode of ["file", "line", "heading", "glossary"] as const) {
      expect(
        resolveCommandPaletteFooterModel({
          mode,
          query: "abc",
          inputValue: "abc",
          entries: results,
          selectedIndex: 0
        })
      ).toEqual({ statusKey: null, canRunSelected: false });
    }
  });
});

describe("CommandPalette reserved Quick Access modes (#145)", () => {
  const reservedCases = [
    { initialInputValue: "abc", mode: "file", key: "commandPalette.reserved.file" },
    { initialInputValue: " abc", mode: "file", key: "commandPalette.reserved.file" },
    { initialInputValue: "%abc", mode: "file", key: "commandPalette.reserved.file" },
    { initialInputValue: "#intro", mode: "heading", key: "commandPalette.reserved.heading" },
    { initialInputValue: "＃intro", mode: "heading", key: "commandPalette.reserved.heading" },
    { initialInputValue: "@alice", mode: "glossary", key: "commandPalette.reserved.glossary" },
    { initialInputValue: "＠alice", mode: "glossary", key: "commandPalette.reserved.glossary" }
  ] as const;

  it.each(reservedCases.map((c) => [c.initialInputValue, c] as const))(
    "shows the reserved-mode message for %j, not the command results list",
    (_input, testCase) => {
      const markup = renderPalette({
        initialInputValue: testCase.initialInputValue
      });

      expect(markup).toContain("commandPaletteReservedPlaceholder");
      expect(markup).toContain(testCase.key);
      // Reserved-mode precedence: no command list, no empty-result text, no
      // result count, and no selectable/clickable result item — so Enter
      // and click can never resolve to a command in a reserved mode.
      expect(markup).not.toContain("commandPaletteList");
      expect(markup).not.toContain("commandPaletteEmpty");
      expect(markup).not.toContain("commandPalette.noResults");
      expect(markup).not.toContain("commandPaletteItem");
      expect(markup).not.toContain("commandPalette.footer.results");
    }
  );

  it("dims the Enter hint in every reserved mode, same as a disabled selection", () => {
    for (const testCase of reservedCases) {
      const markup = renderPalette({
        initialInputValue: testCase.initialInputValue
      });

      expect(markup).toContain("commandPaletteFooterHintUnavailable");
    }
  });

  it("keeps the select/run/close footer key hints visible in reserved modes", () => {
    const markup = renderPalette({ initialInputValue: "#intro" });

    expect(markup).toContain("commandPalette.footer.selectHint");
    expect(markup).toContain("commandPalette.footer.runHint");
    expect(markup).toContain("commandPalette.footer.closeHint");
  });

  it("shows no footer status text (no result count, no search hint) in reserved modes", () => {
    const markup = renderPalette({
      translate: realTranslateEn,
      initialInputValue: "#intro"
    });

    expect(markup).toContain('<div class="commandPaletteFooterStatus"></div>');
  });

  it("computes empty entries for every reserved mode, so Enter/click can never execute or block a command (#145)", () => {
    // CommandPalette.tsx has no logging calls at all (see the wiring
    // describe block below) and only calls onExecuteCommand/onBlockedCommand
    // from a truthy entries[index] lookup. Reserved modes route through this
    // same `entries` computation, gated on mode === "command", so no command
    // lifecycle event (command.invoked / command.ignored / command.blocked)
    // can be emitted from a reserved mode without a code path existing to
    // call either callback in the first place.
    const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

    expect(source).toContain(
      'mode === "command"\n      ? filterCommandPaletteEntries('
    );
    expect(source).toContain(": [];");
  });

  it("resolves no Enter selection when entries is empty, as it always is in a reserved mode", () => {
    expect(resolveCommandPaletteEnterSelection([], 0)).toBeNull();
    expect(resolveCommandPaletteEnterSelection([], null)).toBeNull();
    expect(resolveCommandPaletteEnterSelection([], 5)).toBeNull();
  });

  it("still recognizes '#' and '@' as file-mode-adjacent reserved prefixes, not as file queries", () => {
    // Unknown leading characters (e.g. "%") fall back to file mode per
    // #139, but '#' / '@' are reserved prefixes with their own messages,
    // distinct from the plain no-prefix file message. ':' is no longer
    // reserved (#140) — covered separately below.
    const fileMarkup = renderPalette({ initialInputValue: "%abc" });
    const headingMarkup = renderPalette({ initialInputValue: "#abc" });

    expect(fileMarkup).toContain("commandPalette.reserved.file");
    expect(fileMarkup).not.toContain("commandPalette.reserved.heading");
    expect(headingMarkup).toContain("commandPalette.reserved.heading");
    expect(headingMarkup).not.toContain("commandPalette.reserved.file");
  });

  it("no longer treats ':' as a reserved mode (#140): it shows a line-jump message instead", () => {
    const markup = renderPalette({ initialInputValue: ":abc" });

    expect(markup).toContain("commandPalette.lineJump.invalid");
    expect(markup).not.toContain("commandPalette.reserved");
  });
});

describe("CommandPalette snapshot and UI-level block wiring", () => {
  const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

  it("derives mode from the #139 parser, not the retired resolver (#145)", () => {
    expect(source).toContain(
      'import {\n  parseQuickAccessInput,\n  type QuickAccessMode\n} from "./quickAccessInputParser";'
    );
    expect(source).toContain("parseQuickAccessInput(inputValue)");
    expect(source).toContain("parseQuickAccessInput(value)");
    expect(source).not.toContain("quickAccessPrefixResolver");
    expect(source).not.toContain("resolveQuickAccessInput");
  });

  it("implements line mode through the imported pure resolvers, not ad-hoc logic (#140)", () => {
    expect(source).toContain("resolveLineJumpPaletteState(");
    expect(source).toContain("resolveLineJumpFooterModel(");
    expect(source).toContain("lineJumpMessageKey(");
  });

  it("does not implement the remaining reserved-mode actions — only the reserved message and mode dispatch", () => {
    // File, heading, and glossary remain reserved (for the reserved-message
    // switch and footer suppression) but must not gain their own execution
    // logic here; that belongs to the future mode issues (#141-#143).
    expect(source).not.toContain("symbolJump");
    expect(source).not.toContain("headingSearch");
    expect(source).not.toContain("glossarySearch");
    expect(source).not.toContain("fileQuickOpen");
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

describe("CommandPalette line jump mode (#140)", () => {
  const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

  it("does not show command search results in line mode", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      initialInputValue: ":42"
    });

    expect(markup).not.toContain("commandPaletteEmpty");
    expect(markup).not.toContain("commandPalette.noResults");
  });

  it("shows an executable 'Go to line N' result for a valid, in-range query", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":42"
    });

    expect(markup).toContain("Go to line 42");
    expect(markup).toContain("commandPaletteItemSelected");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain("commandPaletteItemDisabled");
    expect(markup).not.toContain("commandPaletteFooterHintUnavailable");
  });

  it("normalizes the displayed line number for :007 and :1,000", () => {
    const registry = buildLineJumpRegistry(() => true);
    const context = { "editor.kind.markdown": true };

    expect(
      renderPalette({
        registry,
        commandContext: context,
        translate: realTranslateEn,
        initialInputValue: ":007"
      })
    ).toContain("Go to line 7");
    expect(
      renderPalette({
        registry,
        commandContext: context,
        translate: realTranslateEn,
        initialInputValue: ":1,000"
      })
    ).toContain("Go to line 1000");
  });

  it("shows Enter a line number for an empty query", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      translate: realTranslateEn,
      initialInputValue: ":"
    });

    expect(markup).toContain("Enter a line number");
  });

  it("shows Use half-width digits for full-width digit queries", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      translate: realTranslateEn,
      initialInputValue: ":１２"
    });

    expect(markup).toContain("Use half-width digits");
  });

  it("shows Enter a whole line number for decimal queries", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      translate: realTranslateEn,
      initialInputValue: ":1.5"
    });

    expect(markup).toContain("Enter a whole line number");
  });

  it("shows Enter a valid line number for invalid and unsafe-integer queries", () => {
    const invalidMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      translate: realTranslateEn,
      initialInputValue: ":abc"
    });
    const unsafeMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      translate: realTranslateEn,
      initialInputValue: ":9,007,199,254,740,992"
    });

    expect(invalidMarkup).toContain("Enter a valid line number");
    expect(unsafeMarkup).toContain("Enter a valid line number");
  });

  it("shows Line number is out of range when the query is valid but exceeds the active editor", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => false),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":99999"
    });

    expect(markup).toContain("Line number is out of range");
    expect(markup).not.toContain("commandPaletteItem\"");
  });

  it("treats Number.MAX_SAFE_INTEGER as parser-valid but normally out of range", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => false),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":9,007,199,254,740,991"
    });

    expect(markup).toContain("Line number is out of range");
  });

  it("renders a disabled line-jump result (not a parser message) when the active tab is not an editor", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": false },
      translate: realTranslateEn,
      initialInputValue: ":1"
    });

    expect(markup).toContain("Go to line 1");
    expect(markup).toContain("commandPaletteItemDisabled");
    expect(markup).toContain("commandPaletteItemSelected");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("This command is currently unavailable");
    expect(markup).toContain("commandPaletteFooterHintUnavailable");
  });

  it("renders a disabled result, not the generic message, for a Glossary Editor active tab", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": false, "editor.kind.glossary": true },
      translate: realTranslateEn,
      initialInputValue: ":1"
    });

    expect(markup).not.toContain("commandPalette.lineJump.invalid");
    expect(markup).toContain("commandPaletteItemDisabled");
  });

  it("does not show a result count in line mode", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":42"
    });

    expect(markup).not.toContain("commandPalette.footer.results");
  });

  it("executes the line-jump command with the normalized 1-based line on click, for an executable result", () => {
    // No DOM click-simulation library in this repo (see the renderPalette
    // doc comment), so click wiring is verified the same way the existing
    // disabled-entry click test above does: by reading the source for the
    // onClick prop and the callback body it points to.
    const rowStart = source.indexOf('<li\n                role="option"');
    const rowEnd = source.indexOf("</ul>", rowStart);
    const rowBody = source.slice(rowStart, rowEnd);

    expect(rowBody).toContain("onClick={executeLineJumpResult}");

    const functionBody = source.slice(
      source.indexOf("function executeLineJumpResult("),
      source.indexOf("function handleKeyDown(")
    );

    expect(functionBody).toContain('if (lineJumpState.kind === "executable") {');
    expect(functionBody).toContain(
      "onExecuteCommand(editorCommandIds.goToLine, lineJumpState.line);"
    );

    // The render itself must not throw and must show the row this handler
    // is attached to.
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":42"
    });

    expect(markup).toContain("Go to line 42");
  });

  it("blocks (does not execute) a disabled line-jump result on Enter/click, emitting command.blocked semantics via onBlockedCommand", () => {
    const body = source.slice(
      source.indexOf("function executeLineJumpResult("),
      source.indexOf("function handleKeyDown(")
    );

    expect(body).toContain('if (lineJumpState.kind === "disabled") {');
    expect(body).toContain("onBlockedCommand(editorCommandIds.goToLine);");
    expect(body.indexOf('kind === "disabled"')).toBeLessThan(
      body.indexOf('kind === "executable"')
    );
  });

  it("is a no-op for every message state (empty/invalid/unsafe/out-of-range) — no callback is called", () => {
    const body = source.slice(
      source.indexOf("function executeLineJumpResult("),
      source.indexOf("function handleKeyDown(")
    );

    // Only "disabled" and "executable" branches call a callback; every
    // other LineJumpPaletteState kind falls through without calling
    // onExecuteCommand or onBlockedCommand.
    expect(body.match(/onExecuteCommand\(/g)?.length).toBe(1);
    expect(body.match(/onBlockedCommand\(/g)?.length).toBe(1);
  });

  it("routes Enter in line mode to executeLineJumpResult, not the command-mode entry resolver", () => {
    const startIndex = source.indexOf('case "Enter": {');
    const endIndex = source.indexOf("default:");
    const body = source.slice(startIndex, endIndex);

    expect(body).toContain('if (mode === "line") {');
    expect(body.indexOf('if (mode === "line")')).toBeLessThan(
      body.indexOf("resolveCommandPaletteEnterSelection(")
    );
  });

  it("preserves existing command mode, and file/heading/glossary reserved modes", () => {
    const commandMarkup = renderPalette({ initialInputValue: ">save" });
    const fileMarkup = renderPalette({ initialInputValue: "abc" });
    const headingMarkup = renderPalette({ initialInputValue: "#intro" });
    const glossaryMarkup = renderPalette({ initialInputValue: "@alice" });

    expect(commandMarkup).toContain("commandPaletteList");
    expect(fileMarkup).toContain("commandPalette.reserved.file");
    expect(headingMarkup).toContain("commandPalette.reserved.heading");
    expect(glossaryMarkup).toContain("commandPalette.reserved.glossary");
  });
});

describe("CommandPalette line jump result preview (#140 polish)", () => {
  it("shows a preview of the target line as the executable result's secondary line", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":42",
      resolveLineJumpPreviewLine: (line) =>
        line === 42 ? "const answer = 42;" : null
    });

    expect(markup).toContain("commandPaletteItemSecondary");
    expect(markup).toContain("const answer = 42;");
  });

  it("truncates a long target line and appends the ASCII ellipsis", () => {
    const longLine = "x".repeat(30);
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: () => longLine
    });

    expect(markup).toContain(`${"x".repeat(20)}...`);
    expect(markup).not.toContain("x".repeat(21));
  });

  it("does not truncate a short target line", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: () => "short"
    });

    expect(markup).toContain(">short<");
    expect(markup).not.toContain("...");
  });

  it("trims leading whitespace from the preview without affecting document content", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: () => "    indented"
    });

    expect(markup).toContain(">indented<");
    expect(markup).not.toContain(">    indented<");
  });

  it("shows Empty line / 空行 for an empty or whitespace-only target line", () => {
    const englishMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: () => "   "
    });
    const japaneseMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateJa,
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: () => ""
    });

    expect(englishMarkup).toContain("Empty line");
    expect(japaneseMarkup).toContain("空行");
  });

  it("does not show a preview for invalid, out-of-range, or disabled line states", () => {
    const previewLine = vi.fn(() => "should not be shown");

    const invalidMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":abc",
      resolveLineJumpPreviewLine: previewLine
    });
    const outOfRangeMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => false),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":99999",
      resolveLineJumpPreviewLine: previewLine
    });
    const disabledMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": false },
      initialInputValue: ":1",
      resolveLineJumpPreviewLine: previewLine
    });

    expect(invalidMarkup).not.toContain("commandPaletteItemSecondary");
    expect(outOfRangeMarkup).not.toContain("commandPaletteItemSecondary");
    expect(disabledMarkup).not.toContain("commandPaletteItemSecondary");
    expect(previewLine).not.toHaveBeenCalled();
  });

  it("omits the secondary line entirely when no preview resolver is supplied (default prop)", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":1"
    });

    expect(markup).toContain("Go to line 1");
    expect(markup).not.toContain("commandPaletteItemSecondary");
  });

  it("does not change line-jump command execution behavior: click/Enter wiring is unaffected by the preview", () => {
    const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");
    const functionBody = source.slice(
      source.indexOf("function executeLineJumpResult("),
      source.indexOf("function handleKeyDown(")
    );

    expect(functionBody).not.toContain("Preview");
    expect(functionBody).not.toContain("resolveLineJumpPreviewLine");
    expect(functionBody).toContain(
      "onExecuteCommand(editorCommandIds.goToLine, lineJumpState.line);"
    );
  });
});

describe("CommandPalette line jump result selected state (#140 polish)", () => {
  const source = readFileSync("src/renderer/CommandPalette.tsx", "utf8");

  it("marks an executable line-jump result as selected, with enabled styling", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": true },
      translate: realTranslateEn,
      initialInputValue: ":42"
    });

    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("commandPaletteItemSelected");
    expect(markup).not.toContain("commandPaletteItemDisabled");
    expect(markup).not.toContain("commandPaletteFooterHintUnavailable");
  });

  it("marks a disabled line-jump result as selected AND disabled, dimming the Enter hint", () => {
    const markup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      commandContext: { "editor.kind.markdown": false },
      translate: realTranslateEn,
      initialInputValue: ":1"
    });

    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("commandPaletteItemSelected");
    expect(markup).toContain("commandPaletteItemDisabled");
    expect(markup).toContain("commandPaletteFooterHintUnavailable");
    expect(markup).toContain("This command is currently unavailable");
  });

  it("still renders no result row (and no selected state) for parser-invalid or out-of-range message states", () => {
    const invalidMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => true),
      initialInputValue: ":abc"
    });
    const outOfRangeMarkup = renderPalette({
      registry: buildLineJumpRegistry(() => false),
      commandContext: { "editor.kind.markdown": true },
      initialInputValue: ":99999"
    });

    for (const markup of [invalidMarkup, outOfRangeMarkup]) {
      expect(markup).not.toContain("commandPaletteList");
      expect(markup).not.toContain("commandPaletteItem");
      expect(markup).not.toContain("aria-selected");
    }
  });

  it("reuses commandPaletteItemClassName(selected, enabled), not a bespoke class string", () => {
    const rowStart = source.indexOf('<li\n                role="option"');
    const rowEnd = source.indexOf("</ul>", rowStart);
    const rowBody = source.slice(rowStart, rowEnd);

    expect(rowBody).toContain("aria-selected={lineJumpResultSelected}");
    expect(rowBody).toContain(
      'className={commandPaletteItemClassName(\n                  lineJumpResultSelected,\n                  lineJumpState.kind === "executable"\n                )}'
    );
  });

  it("does not change Enter behavior: executable executes, disabled blocks, message states are no-ops", () => {
    // This is a pure visual/ARIA change to the row's selected state — Enter
    // routing (executeLineJumpResult) must be untouched. Covered functionally
    // above (#140 / #140 preview); this pins the source-level invariant that
    // the new selection variable is display-only.
    const functionBody = source.slice(
      source.indexOf("function executeLineJumpResult("),
      source.indexOf("function handleKeyDown(")
    );

    expect(functionBody).not.toContain("lineJumpResultSelected");
    expect(functionBody).toContain('if (lineJumpState.kind === "disabled") {');
    expect(functionBody).toContain("onBlockedCommand(editorCommandIds.goToLine);");
    expect(functionBody).toContain('if (lineJumpState.kind === "executable") {');
    expect(functionBody).toContain(
      "onExecuteCommand(editorCommandIds.goToLine, lineJumpState.line);"
    );
  });
});
