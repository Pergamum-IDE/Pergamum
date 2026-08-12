import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type {
  CreateGlossaryEntryInput,
  GlossaryEntryId
} from "../shared/glossary";
import type { Translate } from "../shared/i18n";

export const glossaryCommandIds = {
  openEntry: defineCommandId<readonly [entryId: GlossaryEntryId], boolean>(
    "glossary.entry.open"
  ),
  createEntry: defineCommandId<
    readonly [input: CreateGlossaryEntryInput],
    boolean
  >("glossary.entry.create")
} as const;

export interface GlossaryCommandController {
  openGlossaryEntry(entryId: GlossaryEntryId): boolean | Promise<boolean>;
  createGlossaryEntry(
    input: CreateGlossaryEntryInput
  ): boolean | Promise<boolean>;
}

export interface GlossaryCommandTitles {
  openEntry: string;
  createEntry: string;
}

type OpenGlossaryEntryCommand = Command<
  readonly [entryId: GlossaryEntryId],
  boolean
>;

type CreateGlossaryEntryCommand = Command<
  readonly [input: CreateGlossaryEntryInput],
  boolean
>;

export function createGlossaryCommandTitles(
  translate: Translate
): GlossaryCommandTitles {
  return {
    openEntry: translate("command.glossary.entry.open"),
    createEntry: translate("command.glossary.entry.create")
  };
}

export function createGlossaryCommands(
  controller: GlossaryCommandController,
  titles: GlossaryCommandTitles
): readonly [OpenGlossaryEntryCommand, CreateGlossaryEntryCommand] {
  return [
    {
      id: glossaryCommandIds.openEntry,
      title: titles.openEntry,
      execute: (entryId) => controller.openGlossaryEntry(entryId)
    },
    {
      id: glossaryCommandIds.createEntry,
      title: titles.createEntry,
      execute: (input) => controller.createGlossaryEntry(input)
    }
  ];
}

export function registerGlossaryCommands(
  registry: CommandRegistry,
  controller: GlossaryCommandController,
  titles: GlossaryCommandTitles
): void {
  const [openEntryCommand, createEntryCommand] = createGlossaryCommands(
    controller,
    titles
  );

  registry.register(openEntryCommand);
  registry.register(createEntryCommand);
}
