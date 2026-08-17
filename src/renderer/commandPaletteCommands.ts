import type { Command, CommandRegistry } from "../shared/commandRegistry";
import { commandPaletteCommandIds } from "../shared/commandIds";
import type { Translate } from "../shared/i18n";

export { commandPaletteCommandIds };

export interface CommandPaletteCommandController {
  openCommandPalette(): void;
}

export interface CommandPaletteCommandTitles {
  open: string;
  openDescription: string;
}

type CommandPaletteCommand = Command<readonly [], void>;

export function createCommandPaletteCommandTitles(
  translate: Translate
): CommandPaletteCommandTitles {
  return {
    open: translate("command.workbench.commandPalette.open"),
    openDescription: translate("command.workbench.commandPalette.open.description")
  };
}

export function createCommandPaletteCommands(
  controller: CommandPaletteCommandController,
  titles: CommandPaletteCommandTitles
): readonly CommandPaletteCommand[] {
  return [
    {
      id: commandPaletteCommandIds.open,
      title: titles.open,
      description: titles.openDescription,
      palette: { visible: false },
      execute: () => controller.openCommandPalette()
    }
  ];
}

export function registerCommandPaletteCommands(
  registry: CommandRegistry,
  controller: CommandPaletteCommandController,
  titles: CommandPaletteCommandTitles
): void {
  for (const command of createCommandPaletteCommands(controller, titles)) {
    registry.register(command);
  }
}
