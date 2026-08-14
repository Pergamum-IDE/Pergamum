import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { Translate } from "../shared/i18n";

export const utilityWindowCommandIds = {
  open: defineCommandId("workbench.utilityWindow.open"),
  close: defineCommandId("workbench.utilityWindow.close"),
  toggle: defineCommandId("workbench.utilityWindow.toggle")
} as const;

export interface UtilityWindowCommandController {
  openUtilityWindow(): void;
  closeUtilityWindow(): void;
  toggleUtilityWindow(): void;
}

export interface UtilityWindowCommandTitles {
  open: string;
  close: string;
  toggle: string;
}

type UtilityWindowCommand = Command<readonly [], void>;

export function createUtilityWindowCommandTitles(
  translate: Translate
): UtilityWindowCommandTitles {
  return {
    open: translate("command.workbench.utilityWindow.open"),
    close: translate("command.workbench.utilityWindow.close"),
    toggle: translate("command.workbench.utilityWindow.toggle")
  };
}

export function createUtilityWindowCommands(
  controller: UtilityWindowCommandController,
  titles: UtilityWindowCommandTitles
): readonly UtilityWindowCommand[] {
  return [
    {
      id: utilityWindowCommandIds.open,
      title: titles.open,
      execute: () => {
        controller.openUtilityWindow();
      }
    },
    {
      id: utilityWindowCommandIds.close,
      title: titles.close,
      execute: () => {
        controller.closeUtilityWindow();
      }
    },
    {
      id: utilityWindowCommandIds.toggle,
      title: titles.toggle,
      execute: () => {
        controller.toggleUtilityWindow();
      }
    }
  ];
}

export function registerUtilityWindowCommands(
  registry: CommandRegistry,
  controller: UtilityWindowCommandController,
  titles: UtilityWindowCommandTitles
): void {
  for (const command of createUtilityWindowCommands(controller, titles)) {
    registry.register(command);
  }
}
