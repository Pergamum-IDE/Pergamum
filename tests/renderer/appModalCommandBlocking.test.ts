import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { editorCommandIds } from "../../src/shared/commandIds";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import { DialogController } from "../../src/renderer/dialog/dialogController";
import type { AppChoiceDialogOptions } from "../../src/renderer/dialog/appDialogTypes";

function choiceOptions(): AppChoiceDialogOptions {
  return {
    title: "Choice",
    message: { kind: "plainText", text: "Choose one." },
    icon: null,
    choices: [
      { id: "save", label: "Save", role: "primary" },
      { id: "cancel", label: "Cancel", role: "cancel" }
    ],
    primaryChoiceId: "save",
    cancelChoiceId: "cancel",
    clipboardText: null
  };
}

describe("app modal command blocking (#190)", () => {
  it("wires pending app modal state into the Command Registry execution blocker", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");
    const blockerIndex = source.indexOf("registry.setCommandExecutionBlocker(");
    const ignoredIndex = source.indexOf("registry.setOnCommandIgnored(");
    const returnRegistryIndex = source.indexOf("return registry;");

    expect(blockerIndex).toBeGreaterThan(-1);
    expect(ignoredIndex).toBeGreaterThan(blockerIndex);
    expect(ignoredIndex).toBeLessThan(returnRegistryIndex);

    const blockerBlock = source.slice(blockerIndex, ignoredIndex);

    expect(blockerBlock).toContain("dialogController.getPendingRequest()");
    expect(blockerBlock).toContain('"app_modal_open"');
    expect(blockerBlock).not.toContain("KeyboardEvent");
    expect(blockerBlock).not.toContain("ctrlKey");
    expect(blockerBlock).not.toContain("metaKey");
    expect(blockerBlock).not.toContain("key ===");
  });

  it("logs command.ignored with the registry-supplied modal reason and the existing disabled fallback", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");
    const handlerIndex = source.indexOf("registry.setOnCommandIgnored(");
    const invokedIndex = source.indexOf("registry.setOnCommandInvoked(");

    expect(handlerIndex).toBeGreaterThan(-1);
    expect(invokedIndex).toBeGreaterThan(handlerIndex);

    const handlerBlock = source.slice(handlerIndex, invokedIndex);

    expect(handlerBlock).toContain('event: "command.ignored"');
    expect(handlerBlock).toContain("commandId: event.commandId");
    expect(handlerBlock).toContain("source: event.source");
    expect(handlerBlock).toContain('result: "ignored"');
    expect(handlerBlock).toContain('reason: event.reason ?? "disabled_command"');
  });

  it("keeps command execution routed through the registry boundary after the modal closes", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");
    const startIndex = source.indexOf("function executeUiCommand<");
    const endIndex = source.indexOf(
      "executeUiCommandRef.current = (commandId) => {"
    );

    expect(startIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(startIndex);

    const executeUiCommandSource = source.slice(startIndex, endIndex);

    expect(executeUiCommandSource).toContain(
      "commandRegistry.execute(commandId, options, ...args).catch"
    );
    expect(executeUiCommandSource).not.toContain("dialogController");
    expect(executeUiCommandSource).not.toContain("pendingDialogRequest");
  });

  it("blocks registry-routed background commands while a choice dialog request is pending", async () => {
    const controller = new DialogController();
    const registry = new CommandRegistry();
    const execute = vi.fn();

    registry.register({
      id: editorCommandIds.saveDocument,
      title: "Save",
      execute
    });
    registry.setCommandExecutionBlocker(() =>
      controller.getPendingRequest() ? "app_modal_open" : null
    );

    const pendingChoice = controller.choice(choiceOptions());

    await expect(
      registry.execute(editorCommandIds.saveDocument, {
        source: "applicationMenu"
      })
    ).rejects.toMatchObject({
      commandId: editorCommandIds.saveDocument,
      reason: "app_modal_open"
    });
    expect(execute).not.toHaveBeenCalled();

    controller.resolve({ kind: "dismissed" });
    await expect(pendingChoice).resolves.toEqual({ kind: "dismissed" });
    await registry.execute(editorCommandIds.saveDocument, {
      source: "applicationMenu"
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
