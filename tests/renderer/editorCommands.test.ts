import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CommandDisabledError,
  CommandRegistry
} from "../../src/shared/commandRegistry";
import { editCommandIds } from "../../src/shared/commandIds";
import {
  createEditorCommandTitles,
  editorCommandIds,
  registerEditorCommands,
  saveDocumentCommandWhen
} from "../../src/renderer/editorCommands";

const titles = {
  openMarkdownDocument: "Open Markdown file",
  saveDocument: "Save current editor",
  cutSelection: "Cut",
  copySelection: "Copy",
  pasteSelection: "Paste",
  selectAllSelection: "Select All"
};
const executionOptions = { source: "toolbar" } as const;

function registerEditorCommandSet(
  registry: CommandRegistry,
  overrides: Partial<{
    openMarkdownDocument: () => void | Promise<void>;
    saveCurrentDocument: () => void | Promise<void>;
    canSaveCurrentDocument: () => boolean;
    delegateNativeEditCommand: (
      commandId: (typeof editCommandIds)[number]
    ) => void | Promise<void>;
    canDelegateNativeEditCommand: (
      commandId: (typeof editCommandIds)[number]
    ) => boolean;
  }> = {}
): void {
  registerEditorCommands(
    registry,
    {
      openMarkdownDocument: () => undefined,
      saveCurrentDocument: () => undefined,
      canSaveCurrentDocument: () => true,
      delegateNativeEditCommand: () => undefined,
      canDelegateNativeEditCommand: () => true,
      ...overrides
    },
    titles
  );

  // `editor.document.save` now also carries a `when` (#128); tests in this
  // file exercise the pre-existing Command.isEnabled/controller wiring, so
  // default the live context to permissive unless a test overrides it.
  registry.setCommandContextProvider(() => ({
    "editor.hasDocument": true,
    "editor.isDirty": true
  }));
}

describe("editor commands", () => {
  it("registers markdown open and current editor save commands", () => {
    const registry = new CommandRegistry();

    registerEditorCommandSet(registry);

    expect(registry.list().map((command) => command.id)).toEqual([
      "editor.document.markdown.open",
      "editor.document.save",
      "editor.selection.cut",
      "editor.selection.copy",
      "editor.selection.paste",
      "editor.selection.selectAll"
    ]);
  });

  it("adds exactly the four Edit selection command IDs", () => {
    expect([...editCommandIds]).toEqual([
      "editor.selection.cut",
      "editor.selection.copy",
      "editor.selection.paste",
      "editor.selection.selectAll"
    ]);
    expect([...editCommandIds]).not.toContain("editor.rightClick.cut");
    expect([...editCommandIds].join("\n")).not.toContain("shortcut");
  });

  it("routes editor commands to their controller methods", async () => {
    const registry = new CommandRegistry();
    const openMarkdownDocument = vi.fn();
    const saveCurrentDocument = vi.fn();

    registerEditorCommandSet(registry, {
      openMarkdownDocument,
      saveCurrentDocument
    });

    await registry.execute(
      editorCommandIds.openMarkdownDocument,
      executionOptions
    );
    await registry.execute(editorCommandIds.saveDocument, executionOptions);

    expect(openMarkdownDocument).toHaveBeenCalledTimes(1);
    expect(saveCurrentDocument).toHaveBeenCalledTimes(1);
  });

  it("routes Edit commands to native edit delegation through the controller", async () => {
    const registry = new CommandRegistry();
    const delegateNativeEditCommand = vi.fn();

    registerEditorCommandSet(registry, {
      delegateNativeEditCommand
    });

    for (const commandId of editCommandIds) {
      await registry.execute(commandId, executionOptions);
    }

    expect(delegateNativeEditCommand.mock.calls.map((call) => call[0])).toEqual(
      [...editCommandIds]
    );
  });

  it("reports save enablement from the current editor save state", () => {
    const registry = new CommandRegistry();
    const canSaveCurrentDocument = vi.fn(() => false);

    registerEditorCommandSet(registry, { canSaveCurrentDocument });

    expect(registry.isEnabled(editorCommandIds.openMarkdownDocument)).toBe(true);
    expect(registry.isEnabled(editorCommandIds.saveDocument)).toBe(false);
    expect(canSaveCurrentDocument).toHaveBeenCalledTimes(1);
  });

  it("reports Edit command enablement through Command.isEnabled", () => {
    const registry = new CommandRegistry();
    const canDelegateNativeEditCommand = vi.fn(
      (commandId: (typeof editCommandIds)[number]) =>
        commandId !== editorCommandIds.pasteSelection
    );

    registerEditorCommandSet(registry, { canDelegateNativeEditCommand });

    expect(registry.isEnabled(editorCommandIds.cutSelection)).toBe(true);
    expect(registry.isEnabled(editorCommandIds.copySelection)).toBe(true);
    expect(registry.isEnabled(editorCommandIds.pasteSelection)).toBe(false);
    expect(registry.isEnabled(editorCommandIds.selectAllSelection)).toBe(true);
    expect(canDelegateNativeEditCommand).toHaveBeenCalledTimes(4);
  });

  it("does not run save when the current editor cannot be saved", async () => {
    // Since the #128 follow-up, CommandRegistry.execute enforces
    // Command.isEnabled itself, so this is now rejected at the registry
    // boundary (CommandDisabledError) rather than by the command body's own
    // internal early-return.
    const registry = new CommandRegistry();
    const saveCurrentDocument = vi.fn();

    registerEditorCommandSet(registry, {
      saveCurrentDocument,
      canSaveCurrentDocument: () => false
    });

    await expect(
      registry.execute(editorCommandIds.saveDocument, executionOptions)
    ).rejects.toBeInstanceOf(CommandDisabledError);

    expect(saveCurrentDocument).not.toHaveBeenCalled();
  });

  it("declares editor.document.save's when as hasDocument and isDirty", () => {
    expect(saveDocumentCommandWhen).toEqual({
      allOf: [{ key: "editor.hasDocument" }, { key: "editor.isDirty" }]
    });
  });

  it("blocks save execution via the registry when the live context is not dirty, even though Command.isEnabled allows it", async () => {
    const registry = new CommandRegistry();
    const saveCurrentDocument = vi.fn();

    registerEditorCommandSet(registry, {
      saveCurrentDocument,
      canSaveCurrentDocument: () => true
    });
    registry.setCommandContextProvider(() => ({
      "editor.hasDocument": true,
      "editor.isDirty": false
    }));

    await expect(
      registry.execute(editorCommandIds.saveDocument, executionOptions)
    ).rejects.toBeInstanceOf(CommandDisabledError);
    expect(saveCurrentDocument).not.toHaveBeenCalled();
  });

  it("allows save execution once the live context reports hasDocument and isDirty", async () => {
    const registry = new CommandRegistry();
    const saveCurrentDocument = vi.fn();

    registerEditorCommandSet(registry, {
      saveCurrentDocument,
      canSaveCurrentDocument: () => true
    });
    registry.setCommandContextProvider(() => ({
      "editor.hasDocument": true,
      "editor.isDirty": true
    }));

    await registry.execute(editorCommandIds.saveDocument, executionOptions);

    expect(saveCurrentDocument).toHaveBeenCalledTimes(1);
  });

  it("creates localized command titles from command i18n keys", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createEditorCommandTitles(translate)).toEqual({
      openMarkdownDocument: "translated:command.editor.document.markdown.open",
      saveDocument: "translated:command.editor.document.save",
      cutSelection: "translated:command.editor.selection.cut",
      copySelection: "translated:command.editor.selection.copy",
      pasteSelection: "translated:command.editor.selection.paste",
      selectAllSelection: "translated:command.editor.selection.selectAll"
    });
  });

  it("does not introduce toolbar-prefixed Command IDs", () => {
    expect(Object.values(editorCommandIds).join("\n")).not.toContain("toolbar.");
  });

  it("keeps editor command definitions independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/editorCommands.ts", "utf8");

    expect(source).toContain("../shared/commandIds");
    expect(source).not.toContain("defineCommandId(");
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });
});
