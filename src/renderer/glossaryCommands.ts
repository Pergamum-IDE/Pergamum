import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { GlossaryEntryId } from "../shared/glossary";
import type { Translate } from "../shared/i18n";

export const glossaryCommandIds = {
  openEntry: defineCommandId<readonly [entryId: GlossaryEntryId], boolean>(
    "glossary.entry.open"
  )
} as const;

export interface GlossaryCommandController {
  openGlossaryEntry(entryId: GlossaryEntryId): boolean | Promise<boolean>;
}

export interface GlossaryCommandTitles {
  openEntry: string;
}

type OpenGlossaryEntryCommand = Command<
  readonly [entryId: GlossaryEntryId],
  boolean
>;

export function createGlossaryCommandTitles(
  translate: Translate
): GlossaryCommandTitles {
  return {
    openEntry: translate("command.glossary.entry.open")
  };
}

export function createGlossaryCommands(
  controller: GlossaryCommandController,
  titles: GlossaryCommandTitles
): readonly OpenGlossaryEntryCommand[] {
  return [
    {
      id: glossaryCommandIds.openEntry,
      title: titles.openEntry,
      execute: (entryId) => controller.openGlossaryEntry(entryId)
    }
  ];
}

export function registerGlossaryCommands(
  registry: CommandRegistry,
  controller: GlossaryCommandController,
  titles: GlossaryCommandTitles
): void {
  for (const command of createGlossaryCommands(controller, titles)) {
    registry.register(command);
  }
}
