import type { Command, CommandRegistry } from "../shared/commandRegistry";
import type { CommandEnablementExpression } from "../shared/commandEnablement";
import { editorCommandIds } from "../shared/commandIds";
import type { Translate } from "../shared/i18n";

export { editorCommandIds };

/**
 * Applies only to active line-addressable editors (#140). Markdown is the
 * only such editor kind today; Glossary Editor must not receive line jump.
 * The palette's non-editor "unavailable" state is derived from this same
 * `when`, not from an independent palette-only check (#128).
 */
export const goToLineCommandWhen: CommandEnablementExpression = {
  key: "editor.kind.markdown"
};

export interface LineJumpCommandController {
  /**
   * Whether `line` (1-based) is within the currently active editor. Reads
   * live state (like `canSaveCurrentDocument`), not the Palette's frozen
   * context snapshot, so it always reflects the editor active at call time.
   */
  canGoToLine(line: number): boolean;
  /** Moves the cursor to `line` (1-based) in the currently active editor. */
  goToLine(line: number): void;
}

export interface LineJumpCommandTitles {
  goToLine: string;
  goToLineDescription: string;
}

type LineJumpCommand = Command<readonly [number], void>;

export function createLineJumpCommandTitles(
  translate: Translate
): LineJumpCommandTitles {
  return {
    goToLine: translate("command.editor.line.goTo"),
    goToLineDescription: translate("command.editor.line.goTo.description")
  };
}

export function createLineJumpCommands(
  controller: LineJumpCommandController,
  titles: LineJumpCommandTitles
): readonly LineJumpCommand[] {
  return [
    {
      id: editorCommandIds.goToLine,
      title: titles.goToLine,
      description: titles.goToLineDescription,
      // Takes a required line-number argument, which `>` command search has
      // no way to prompt for; only Quick Access `:` mode invokes this.
      palette: { visible: false },
      when: goToLineCommandWhen,
      isEnabled: (line) => controller.canGoToLine(line),
      execute: (line) => controller.goToLine(line)
    }
  ];
}

export function registerLineJumpCommands(
  registry: CommandRegistry,
  controller: LineJumpCommandController,
  titles: LineJumpCommandTitles
): void {
  for (const command of createLineJumpCommands(controller, titles)) {
    registry.register(command);
  }
}
