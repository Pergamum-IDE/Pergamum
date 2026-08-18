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
   * Moves the cursor to `line` (1-based) in the currently active editor, or
   * silently does nothing if `line` is out of range for it (#148: range is
   * command-body validation, not registry enablement — an out-of-range
   * direct invocation still reaches this body and still emits
   * `command.invoked`, it just doesn't navigate).
   */
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
      // Enablement is editor-kind only (#148): range is not a registry
      // enablement gate, so an out-of-range target still reaches the body
      // and still emits `command.invoked` — it does not become
      // `command.ignored`. The body itself no-ops on out-of-range.
      when: goToLineCommandWhen,
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
