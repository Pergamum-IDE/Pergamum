import { describe, expect, it, vi } from "vitest";
import {
  applicationCommandIds,
  editorCommandIds
} from "../../src/shared/commandIds";
import {
  invokeFileMenuCommand,
  subscribeApplicationMenuCommands,
  type FileMenuCommandExecutor
} from "../../src/renderer/applicationMenuBridge";

describe("application menu renderer bridge", () => {
  it("invokes allowlisted File menu commands", () => {
    const execute = vi.fn<FileMenuCommandExecutor>();

    expect(invokeFileMenuCommand(editorCommandIds.saveDocument, execute)).toBe(
      true
    );
    expect(execute).toHaveBeenCalledWith(editorCommandIds.saveDocument);
  });

  it("ignores command IDs outside the File menu allowlist", () => {
    const execute = vi.fn<FileMenuCommandExecutor>();

    expect(invokeFileMenuCommand("workspace.files.focus", execute)).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns the subscription cleanup function", () => {
    const unsubscribe = vi.fn();
    const onCommand = vi.fn(() => unsubscribe);

    const cleanup = subscribeApplicationMenuCommands(onCommand, () => vi.fn());

    expect(cleanup).toBe(unsubscribe);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("uses the latest executor and avoids stale closures", () => {
    let listener: ((commandId: string) => void) | null = null;
    const firstExecute = vi.fn<FileMenuCommandExecutor>();
    const secondExecute = vi.fn<FileMenuCommandExecutor>();
    let currentExecute = firstExecute;

    subscribeApplicationMenuCommands(
      (callback) => {
        listener = callback;
        return () => undefined;
      },
      () => currentExecute
    );

    listener?.(editorCommandIds.saveDocument);
    currentExecute = secondExecute;
    listener?.(applicationCommandIds.openProject);

    expect(firstExecute).toHaveBeenCalledWith(editorCommandIds.saveDocument);
    expect(secondExecute).toHaveBeenCalledWith(applicationCommandIds.openProject);
  });
});
