import {
  isFileMenuCommandId,
  type FileMenuCommandId
} from "../shared/commandIds";

export type ApplicationMenuCommandSubscription = (
  callback: (commandId: string) => void
) => () => void;

export type FileMenuCommandExecutor = (commandId: FileMenuCommandId) => void;
export type ApplicationMenuCommandExecutor = (commandId: string) => void;

export function invokeFileMenuCommand(
  commandId: string,
  execute: FileMenuCommandExecutor
): boolean {
  if (!isFileMenuCommandId(commandId)) {
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
