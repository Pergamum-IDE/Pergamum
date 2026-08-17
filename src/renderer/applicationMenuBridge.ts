import {
  isApplicationMenuCommandId,
  type ApplicationMenuCommandId
} from "../shared/commandIds";

export type ApplicationMenuCommandSubscription = (
  callback: (commandId: string) => void
) => () => void;

export type ApplicationMenuAllowedCommandExecutor = (
  commandId: ApplicationMenuCommandId
) => void;
export type ApplicationMenuCommandExecutor = (commandId: string) => void;

export function invokeApplicationMenuCommand(
  commandId: string,
  execute: ApplicationMenuAllowedCommandExecutor
): boolean {
  if (!isApplicationMenuCommandId(commandId)) {
    return false;
  }

  execute(commandId);
  return true;
}

export function subscribeApplicationMenuCommands(
  onCommand: ApplicationMenuCommandSubscription,
  getExecutor: () => ApplicationMenuCommandExecutor
): () => void {
  return onCommand((commandId) => {
    getExecutor()(commandId);
  });
}
