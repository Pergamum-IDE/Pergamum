import { describe, expect, it } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import {
  commandPaletteCommandIds,
  createCommandPaletteCommandTitles,
  registerCommandPaletteCommands
} from "../../src/renderer/commandPaletteCommands";

const translate: Translate = (key) => key;

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
    expect(command?.canonicalLabel).toBe("Command Palette: Open");
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

    await registry.execute(commandPaletteCommandIds.open);

    expect(opened).toBe(true);
  });

  it("derives command titles and description through translate", () => {
    expect(createCommandPaletteCommandTitles(translate)).toEqual({
      open: "command.workbench.commandPalette.open",
      openDescription: "command.workbench.commandPalette.open.description"
    });
  });
});
