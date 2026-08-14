import { describe, expect, it } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import {
  createUtilityWindowCommandTitles,
  registerUtilityWindowCommands,
  utilityWindowCommandIds
} from "../../src/renderer/utilityWindowCommands";

const translate: Translate = (key) => key;

describe("utility window commands", () => {
  const titles = {
    open: "Open Utility Window",
    close: "Close Utility Window",
    toggle: "Toggle Utility Window"
  };

  it("registers open, close, and toggle commands", () => {
    const registry = new CommandRegistry();

    registerUtilityWindowCommands(
      registry,
      {
        openUtilityWindow: () => undefined,
        closeUtilityWindow: () => undefined,
        toggleUtilityWindow: () => undefined
      },
      titles
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      utilityWindowCommandIds.open,
      utilityWindowCommandIds.close,
      utilityWindowCommandIds.toggle
    ]);
  });

  it("opens the Utility Window through the open command", async () => {
    const registry = new CommandRegistry();
    let open = false;

    registerUtilityWindowCommands(
      registry,
      {
        openUtilityWindow: () => {
          open = true;
        },
        closeUtilityWindow: () => {
          open = false;
        },
        toggleUtilityWindow: () => {
          open = !open;
        }
      },
      titles
    );

    await registry.execute(utilityWindowCommandIds.open);
    expect(open).toBe(true);

    await registry.execute(utilityWindowCommandIds.close);
    expect(open).toBe(false);

    await registry.execute(utilityWindowCommandIds.toggle);
    expect(open).toBe(true);

    await registry.execute(utilityWindowCommandIds.toggle);
    expect(open).toBe(false);
  });

  it("derives command titles through translate", () => {
    expect(createUtilityWindowCommandTitles(translate)).toEqual({
      open: "command.workbench.utilityWindow.open",
      close: "command.workbench.utilityWindow.close",
      toggle: "command.workbench.utilityWindow.toggle"
    });
  });
});
