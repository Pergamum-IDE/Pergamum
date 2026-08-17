import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { CommandEnablementExpression } from "../shared/commandEnablement";
import type { Translate } from "../shared/i18n";

export const glossaryOccurrenceTrackingCommandWhen: CommandEnablementExpression =
  { key: "glossary.occurrences.tracking.active" };

export const glossaryOccurrencesCommandIds = {
  previous: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.previous"
  ),
  next: defineCommandId<readonly [], boolean>("glossary.occurrences.next"),
  openEntry: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.entry.open"
  ),
  closeTracking: defineCommandId<readonly [], boolean>(
    "glossary.occurrences.tracking.close"
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
    openEntry: translate("command.glossary.occurrences.entry.open"),
    closeTracking: translate("command.glossary.occurrences.tracking.close")
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
      execute: () => controller.navigateToPreviousOccurrence(),
      when: glossaryOccurrenceTrackingCommandWhen
    },
    {
      id: glossaryOccurrencesCommandIds.next,
      title: titles.next,
      execute: () => controller.navigateToNextOccurrence(),
      when: glossaryOccurrenceTrackingCommandWhen
    },
    {
      id: glossaryOccurrencesCommandIds.openEntry,
      title: titles.openEntry,
      execute: () => controller.openTrackedGlossaryEntry()
    },
    {
      id: glossaryOccurrencesCommandIds.closeTracking,
      title: titles.closeTracking,
      execute: () => controller.closeGlossaryOccurrenceTracking(),
      when: glossaryOccurrenceTrackingCommandWhen
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
