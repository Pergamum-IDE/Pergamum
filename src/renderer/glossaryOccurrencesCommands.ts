import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { Translate } from "../shared/i18n";

export const glossaryOccurrencesCommandIds = {
  previous: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.previous"
  ),
  next: defineCommandId<readonly [], boolean>("glossary.occurrences.next"),
  openEntry: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.openEntry"
  ),
  closeTracking: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.closeTracking"
  )
} as const;

export interface GlossaryOccurrencesCommandController {
  navigateToPreviousOccurrence(): boolean | Promise<boolean>;
  navigateToNextOccurrence(): boolean | Promise<boolean>;
  openTrackedGlossaryEntry(): boolean | Promise<boolean>;
  closeGlossaryOccurrenceTracking(): boolean | Promise<boolean>;
}

export interface GlossaryOccurrencesCommandTitles {
  previous: string;
  next: string;
  openEntry: string;
  closeTracking: string;
}

type GlossaryOccurrencesCommand = Command<readonly [], boolean>;

export function createGlossaryOccurrencesCommandTitles(
  translate: Translate
): GlossaryOccurrencesCommandTitles {
  return {
    previous: translate("command.glossary.occurrences.previous"),
    next: translate("command.glossary.occurrences.next"),
    openEntry: translate("command.glossary.occurrences.openEntry"),
    closeTracking: translate("command.glossary.occurrences.closeTracking")
  };
}

export function createGlossaryOccurrencesCommands(
  controller: GlossaryOccurrencesCommandController,
  titles: GlossaryOccurrencesCommandTitles
): readonly GlossaryOccurrencesCommand[] {
  return [
    {
      id: glossaryOccurrencesCommandIds.previous,
      title: titles.previous,
      execute: () => controller.navigateToPreviousOccurrence()
    },
    {
      id: glossaryOccurrencesCommandIds.next,
      title: titles.next,
      execute: () => controller.navigateToNextOccurrence()
    },
    {
      id: glossaryOccurrencesCommandIds.openEntry,
      title: titles.openEntry,
      execute: () => controller.openTrackedGlossaryEntry()
    },
    {
      id: glossaryOccurrencesCommandIds.closeTracking,
      title: titles.closeTracking,
      execute: () => controller.closeGlossaryOccurrenceTracking()
    }
  ];
}

export function registerGlossaryOccurrencesCommands(
  registry: CommandRegistry,
  controller: GlossaryOccurrencesCommandController,
  titles: GlossaryOccurrencesCommandTitles
): void {
  for (const command of createGlossaryOccurrencesCommands(
    controller,
    titles
  )) {
    registry.register(command);
  }
}
