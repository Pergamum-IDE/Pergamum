import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { Translate } from "../shared/i18n";
import type { SidebarMode } from "./sidebarMode";
import { selectSidebarMode } from "./sidebarMode";

export const workspaceCommandIds = {
  focusFiles: defineCommandId("workspace.files.focus"),
  focusSearch: defineCommandId("workspace.search.focus"),
  focusGlossary: defineCommandId("workspace.glossary.focus"),
  toggleSettings: defineCommandId("workspace.settings.toggle")
} as const;

export type WorkspaceFocusCommandId =
  | typeof workspaceCommandIds.focusFiles
  | typeof workspaceCommandIds.focusSearch
  | typeof workspaceCommandIds.focusGlossary;

export interface WorkspaceCommandController {
  focusSidebarMode(mode: SidebarMode): void;
  toggleProjectSettings(): void;
}

export interface WorkspaceCommandTitles {
  focusFiles: string;
  focusSearch: string;
  focusGlossary: string;
  toggleSettings: string;
}

type WorkspaceCommand = Command<readonly [], void>;

export function createWorkspaceCommandTitles(
  translate: Translate
): WorkspaceCommandTitles {
  return {
    focusFiles: translate("command.workspace.files.focus"),
    focusSearch: translate("command.workspace.search.focus"),
    focusGlossary: translate("command.workspace.glossary.focus"),
    toggleSettings: translate("command.workspace.settings.toggle")
  };
}

export function workspaceFocusCommandIdForMode(
  mode: SidebarMode
): WorkspaceFocusCommandId {
  switch (selectSidebarMode(mode)) {
    case "files":
      return workspaceCommandIds.focusFiles;
    case "search":
      return workspaceCommandIds.focusSearch;
    case "glossary":
      return workspaceCommandIds.focusGlossary;
  }
}

export function createWorkspaceCommands(
  controller: WorkspaceCommandController,
  titles: WorkspaceCommandTitles
): readonly WorkspaceCommand[] {
  return [
    {
      id: workspaceCommandIds.focusFiles,
      title: titles.focusFiles,
      execute: () => {
        controller.focusSidebarMode("files");
      }
    },
    {
      id: workspaceCommandIds.focusSearch,
      title: titles.focusSearch,
      execute: () => {
        controller.focusSidebarMode("search");
      }
    },
    {
      id: workspaceCommandIds.focusGlossary,
      title: titles.focusGlossary,
      execute: () => {
        controller.focusSidebarMode("glossary");
      }
    },
    {
      id: workspaceCommandIds.toggleSettings,
      title: titles.toggleSettings,
      execute: () => {
        controller.toggleProjectSettings();
      }
    }
  ];
}

export function registerWorkspaceCommands(
  registry: CommandRegistry,
  controller: WorkspaceCommandController,
  titles: WorkspaceCommandTitles
): void {
  for (const command of createWorkspaceCommands(controller, titles)) {
    registry.register(command);
  }
}
