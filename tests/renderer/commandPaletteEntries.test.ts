import { describe, expect, it } from "vitest";
import { CommandRegistry, defineCommandId } from "../../src/shared/commandRegistry";
import {
  filterCommandPaletteEntries,
  firstEnabledCommandPaletteIndex,
  listCommandPaletteEntries,
  moveCommandPaletteSelection,
  resolveCommandPaletteEnterSelection,
  type CommandPaletteEntry
} from "../../src/renderer/commandPaletteEntries";

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
    id: defineCommandId("test.command.openProject"),
    title: "プロジェクトを開く",
    execute: () => undefined,
    isEnabled: () => false
  });
  registry.register({
    id: defineCommandId("test.command.hidden"),
    title: "Hidden",
    palette: { visible: false },
    execute: () => undefined
  });

  return registry;
}

describe("listCommandPaletteEntries", () => {
  it("lists commands in registry order, excluding palette.visible=false", () => {
    const registry = buildRegistry();

    expect(listCommandPaletteEntries(registry).map((entry) => entry.id)).toEqual([
      "test.command.save",
      "test.command.openProject"
    ]);
  });

  it("carries label, description, canonicalLabel, and live enabled state", () => {
    const registry = buildRegistry();
    const entries = listCommandPaletteEntries(registry);

    expect(entries[0]).toEqual({
      id: "test.command.save",
      label: "保存",
      description: "現在の文書を保存",
      canonicalLabel: "Save Document",
      enabled: true
    });
    expect(entries[1]).toMatchObject({
      id: "test.command.openProject",
      label: "プロジェクトを開く",
      enabled: false
    });
  });

  it("defaults to visible when palette metadata is unset", () => {
    const registry = new CommandRegistry();

    registry.register({
      id: defineCommandId("test.command.default"),
      title: "Default",
      execute: () => undefined
    });

    expect(listCommandPaletteEntries(registry)).toHaveLength(1);
  });

  it("reports when-gated commands as disabled against a context snapshot", () => {
    const registry = new CommandRegistry();

    registry.register({
      id: defineCommandId("test.command.whenGated"),
      title: "When gated",
      execute: () => undefined,
      when: { key: "editor.isDirty" }
    });

    expect(
      listCommandPaletteEntries(registry, { "editor.isDirty": false })
    ).toEqual([
      {
        id: "test.command.whenGated",
        label: "When gated",
        description: undefined,
        canonicalLabel: undefined,
        enabled: false
      }
    ]);
    expect(
      listCommandPaletteEntries(registry, { "editor.isDirty": true })
    ).toMatchObject([{ enabled: true }]);
  });

  it("treats a missing snapshot the same as an empty context", () => {
    const registry = new CommandRegistry();

    registry.register({
      id: defineCommandId("test.command.whenGated"),
      title: "When gated",
      execute: () => undefined,
      when: { key: "editor.isDirty" }
    });

    expect(listCommandPaletteEntries(registry)).toMatchObject([
      { enabled: false }
    ]);
  });
});

describe("filterCommandPaletteEntries", () => {
  const entries: CommandPaletteEntry[] = [
    {
      id: defineCommandId("test.command.save"),
      label: "保存",
      description: "現在の文書を保存",
      canonicalLabel: "Save Document",
      enabled: true
    },
    {
      id: defineCommandId("test.command.openProject"),
      label: "プロジェクトを開く",
      enabled: true
    }
  ];

  it("returns all entries for an empty query", () => {
    expect(filterCommandPaletteEntries(entries, "")).toEqual(entries);
    expect(filterCommandPaletteEntries(entries, "   ")).toEqual(entries);
  });

  it("matches by id case-insensitively", () => {
    expect(
      filterCommandPaletteEntries(entries, "SAVE").map((entry) => entry.id)
    ).toEqual(["test.command.save"]);
  });

  it("matches by label", () => {
    expect(
      filterCommandPaletteEntries(entries, "保存").map((entry) => entry.id)
    ).toEqual(["test.command.save"]);
  });

  it("matches by description", () => {
    expect(
      filterCommandPaletteEntries(entries, "文書").map((entry) => entry.id)
    ).toEqual(["test.command.save"]);
  });

  it("matches by canonicalLabel case-insensitively", () => {
    expect(
      filterCommandPaletteEntries(entries, "document").map((entry) => entry.id)
    ).toEqual(["test.command.save"]);
  });

  it("returns no entries when nothing matches", () => {
    expect(filterCommandPaletteEntries(entries, "zzz")).toEqual([]);
  });
});

describe("firstEnabledCommandPaletteIndex", () => {
  it("returns the index of the first enabled entry", () => {
    expect(
      firstEnabledCommandPaletteIndex([
        { id: defineCommandId("test.a"), label: "a", enabled: false },
        { id: defineCommandId("test.b"), label: "b", enabled: true }
      ])
    ).toBe(1);
  });

  it("returns null when no entry is enabled", () => {
    expect(
      firstEnabledCommandPaletteIndex([
        { id: defineCommandId("test.a"), label: "a", enabled: false }
      ])
    ).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(firstEnabledCommandPaletteIndex([])).toBeNull();
  });
});

describe("moveCommandPaletteSelection", () => {
  it("clamps at the last index when moving down past the end", () => {
    expect(moveCommandPaletteSelection(3, 2, 1)).toBe(2);
  });

  it("clamps at the first index when moving up past the start", () => {
    expect(moveCommandPaletteSelection(3, 0, -1)).toBe(0);
  });

  it("starts at index 0 when moving down from no selection", () => {
    expect(moveCommandPaletteSelection(3, null, 1)).toBe(0);
  });

  it("starts at the last index when moving up from no selection", () => {
    expect(moveCommandPaletteSelection(3, null, -1)).toBe(2);
  });

  it("returns null when there are no entries", () => {
    expect(moveCommandPaletteSelection(0, null, 1)).toBeNull();
  });
});

describe("resolveCommandPaletteEnterSelection", () => {
  const entries: CommandPaletteEntry[] = [
    { id: defineCommandId("test.enabled"), label: "Enabled", enabled: true },
    { id: defineCommandId("test.disabled"), label: "Disabled", enabled: false }
  ];

  it("returns the entry for an enabled selection", () => {
    expect(resolveCommandPaletteEnterSelection(entries, 0)).toEqual(
      entries[0]
    );
  });

  it("returns the entry even when it is disabled, for the caller to decide", () => {
    expect(resolveCommandPaletteEnterSelection(entries, 1)).toEqual(
      entries[1]
    );
  });

  it("returns null when nothing is selected", () => {
    expect(resolveCommandPaletteEnterSelection(entries, null)).toBeNull();
  });

  it("is not confused by an out-of-range index", () => {
    expect(resolveCommandPaletteEnterSelection(entries, 99)).toBeNull();
  });
});
