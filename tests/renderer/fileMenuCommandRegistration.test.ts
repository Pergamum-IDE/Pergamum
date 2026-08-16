import { describe, expect, it } from "vitest";
import { fileMenuCommandIds } from "../../src/shared/commandIds";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import { registerApplicationCommands } from "../../src/renderer/applicationCommands";
import { registerCommandPaletteCommands } from "../../src/renderer/commandPaletteCommands";
import { registerEditorCommands } from "../../src/renderer/editorCommands";

describe("File menu command registration", () => {
  it("registers every allowlisted File menu command in the renderer registry", () => {
    const registry = new CommandRegistry();

    registerApplicationCommands(
      registry,
      {
        openProject: () => undefined,
        toggleRecentProjects: () => undefined
      },
      {
        openProject: "Open Project",
        toggleRecentProjects: "Toggle Recent Projects"
      }
    );
    registerEditorCommands(
      registry,
      {
        openMarkdownDocument: () => undefined,
        saveCurrentDocument: () => undefined,
        canSaveCurrentDocument: () => true,
        delegateNativeEditCommand: () => undefined,
        canDelegateNativeEditCommand: () => true
      },
      {
        openMarkdownDocument: "Open Markdown File",
        saveDocument: "Save",
        cutSelection: "Cut",
        copySelection: "Copy",
        pasteSelection: "Paste",
        selectAllSelection: "Select All"
      }
    );
    registerCommandPaletteCommands(
      registry,
      { openCommandPalette: () => undefined },
      { open: "Command Palette", openDescription: "Open the Command Palette" }
    );

    expect(
      fileMenuCommandIds.map((commandId) => registry.get(commandId))
    ).toEqual(fileMenuCommandIds.map(() => expect.any(Object)));
  });
});
