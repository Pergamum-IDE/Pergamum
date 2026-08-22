import type { Command, CommandRegistry } from "../shared/commandRegistry";
import { applicationCommandIds } from "../shared/commandIds";
import type { Translate } from "../shared/i18n";

export { applicationCommandIds };

export interface ApplicationCommandController {
  createProject(): void | Promise<void>;
  openProject(): void | Promise<void>;
  toggleRecentProjects(): void;
}

export interface ApplicationCommandTitles {
  createProject: string;
  openProject: string;
  toggleRecentProjects: string;
}

type ApplicationCommand = Command<readonly [], void>;

export function createApplicationCommandTitles(
  translate: Translate
): ApplicationCommandTitles {
  return {
    createProject: translate("command.workspace.project.create"),
    openProject: translate("command.workspace.project.open"),
    toggleRecentProjects: translate("command.workspace.recentProjects.toggle")
  };
}

export function createApplicationCommands(
  controller: ApplicationCommandController,
  titles: ApplicationCommandTitles
): readonly ApplicationCommand[] {
  return [
    {
      id: applicationCommandIds.createProject,
      title: titles.createProject,
      execute: () => controller.createProject()
    },
    {
      id: applicationCommandIds.openProject,
      title: titles.openProject,
      execute: () => controller.openProject()
    },
    {
      id: applicationCommandIds.toggleRecentProjects,
      title: titles.toggleRecentProjects,
      execute: () => controller.toggleRecentProjects()
    }
  ];
}

export function registerApplicationCommands(
  registry: CommandRegistry,
  controller: ApplicationCommandController,
  titles: ApplicationCommandTitles
): void {
  for (const command of createApplicationCommands(controller, titles)) {
    registry.register(command);
  }
}
