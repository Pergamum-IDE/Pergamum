import {
  defineCommandId,
  type Command,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { Translate } from "../shared/i18n";

export const editorCommandIds = {
  openMarkdownDocument: defineCommandId("editor.document.markdown.open"),
  saveDocument: defineCommandId("editor.document.save")
} as const;

export interface EditorCommandController {
  openMarkdownDocument(): void | Promise<void>;
  saveCurrentDocument(): void | Promise<void>;
  canSaveCurrentDocument(): boolean;
}

export interface EditorCommandTitles {
  openMarkdownDocument: string;
  saveDocument: string;
}

type EditorCommand = Command<readonly [], void>;

export function createEditorCommandTitles(
  translate: Translate
): EditorCommandTitles {
  return {
    openMarkdownDocument: translate("command.editor.document.markdown.open"),
    saveDocument: translate("command.editor.document.save")
  };
}

export function createEditorCommands(
  controller: EditorCommandController,
  titles: EditorCommandTitles
): readonly EditorCommand[] {
  return [
    {
      id: editorCommandIds.openMarkdownDocument,
      title: titles.openMarkdownDocument,
      execute: () => controller.openMarkdownDocument()
    },
    {
      id: editorCommandIds.saveDocument,
      title: titles.saveDocument,
      execute: () => {
        if (!controller.canSaveCurrentDocument()) {
          return;
        }

        return controller.saveCurrentDocument();
      },
      isEnabled: () => controller.canSaveCurrentDocument()
    }
  ];
}

export function registerEditorCommands(
  registry: CommandRegistry,
  controller: EditorCommandController,
  titles: EditorCommandTitles
): void {
  for (const command of createEditorCommands(controller, titles)) {
    registry.register(command);
  }
}
