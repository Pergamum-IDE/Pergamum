import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
});
