import {
  isFileMenuCommandId,
  type FileMenuCommandId
} from "../shared/commandIds";

export type ApplicationMenuCommandSubscription = (
  callback: (commandId: string) => void
) => () => void;

export type FileMenuCommandExecutor = (commandId: FileMenuCommandId) => void;

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
  getExecutor: () => FileMenuCommandExecutor
): () => void {
  return onCommand((commandId) => {
    invokeFileMenuCommand(commandId, getExecutor());
  });
}
