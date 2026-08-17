import { describe, expect, it } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import {
  filterCommandPaletteEntries,
  listCommandPaletteEntries
} from "../../src/renderer/commandPaletteEntries";
import {
  commandPaletteCommandIds,
  createCommandPaletteCommandTitles,
  registerCommandPaletteCommands
} from "../../src/renderer/commandPaletteCommands";

const translate: Translate = (key) => key;
const executionOptions = { source: "commandPalette" } as const;

describe("command palette commands", () => {
  const titles = {
    open: "Open Command Palette",
    openDescription: "Open the Command Palette to search and run commands"
  };

  it("registers the open command with palette metadata", () => {
    const registry = new CommandRegistry();

    registerCommandPaletteCommands(
      registry,
      { openCommandPalette: () => undefined },
      titles
    );

    const command = registry.get(commandPaletteCommandIds.open);

    expect(command?.title).toBe(titles.open);
    expect(command?.description).toBe(titles.openDescription);
    expect(command?.canonicalLabel).toBeUndefined();
    expect(command?.palette).toEqual({ visible: false });
  });

  it("keeps the open command registered but hides it from Command Palette results", () => {
    const registry = new CommandRegistry();

    registerCommandPaletteCommands(
      registry,
      { openCommandPalette: () => undefined },
      titles
    );

    expect(registry.get(commandPaletteCommandIds.open)).not.toBeNull();
    expect(listCommandPaletteEntries(registry)).toEqual([]);
    expect(filterCommandPaletteEntries(listCommandPaletteEntries(registry), "open"))
      .toEqual([]);
  });

  it("delegates execution to the controller", async () => {
    const registry = new CommandRegistry();
    let opened = false;

    registerCommandPaletteCommands(
      registry,
      {
        openCommandPalette: () => {
          opened = true;
        }
      },
      titles
    );

    await registry.execute(commandPaletteCommandIds.open, executionOptions);

    expect(opened).toBe(true);
  });

  it("derives command titles and description through translate", () => {
    expect(createCommandPaletteCommandTitles(translate)).toEqual({
      open: "command.workbench.commandPalette.open",
      openDescription: "command.workbench.commandPalette.open.description"
    });
  });
});
