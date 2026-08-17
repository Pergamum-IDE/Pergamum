import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import type { SidebarMode } from "../../src/renderer/sidebarMode";
import {
  createWorkspaceCommandTitles,
  registerWorkspaceCommands,
  workspaceCommandIds,
  workspaceFocusCommandIdForMode
} from "../../src/renderer/workspaceCommands";

const executionOptions = { source: "activityBar" } as const;

describe("workspace commands", () => {
  const titles = {
    focusFiles: "Focus Files",
    focusSearch: "Focus Search",
    focusGlossary: "Focus Glossary",
    toggleSettings: "Toggle Settings"
  };

  it("registers Workspace focus and settings commands", () => {
    const registry = new CommandRegistry();

    registerWorkspaceCommands(
      registry,
      {
        focusSidebarMode: () => undefined,
        toggleProjectSettings: () => undefined
      },
      titles
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      workspaceCommandIds.focusFiles,
      workspaceCommandIds.focusSearch,
      workspaceCommandIds.focusGlossary,
      workspaceCommandIds.toggleSettings
    ]);
  });

  it("focuses the requested Sidebar mode through commands", async () => {
    const registry = new CommandRegistry();
    const focusedModes: SidebarMode[] = [];

    registerWorkspaceCommands(
      registry,
      {
        focusSidebarMode: (mode) => {
          focusedModes.push(mode);
        },
        toggleProjectSettings: () => undefined
      },
      titles
    );

    await registry.execute(workspaceCommandIds.focusFiles, executionOptions);
    await registry.execute(workspaceCommandIds.focusSearch, executionOptions);
    await registry.execute(workspaceCommandIds.focusGlossary, executionOptions);

    expect(focusedModes).toEqual(["files", "search", "glossary"]);
  });

  it("toggles Project Settings through a command", async () => {
    const registry = new CommandRegistry();
    const toggleProjectSettings = vi.fn();

    registerWorkspaceCommands(
      registry,
      {
        focusSidebarMode: () => undefined,
        toggleProjectSettings
      },
      titles
    );

    await registry.execute(workspaceCommandIds.toggleSettings, executionOptions);

    expect(toggleProjectSettings).toHaveBeenCalledTimes(1);
  });

  it("maps Sidebar modes to stable Workspace Command IDs", () => {
    expect(workspaceFocusCommandIdForMode("files")).toBe(
      workspaceCommandIds.focusFiles
    );
    expect(workspaceFocusCommandIdForMode("search")).toBe(
      workspaceCommandIds.focusSearch
    );
    expect(workspaceFocusCommandIdForMode("glossary")).toBe(
      workspaceCommandIds.focusGlossary
    );
  });

  it("creates localized command titles outside the registry", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createWorkspaceCommandTitles(translate)).toEqual({
      focusFiles: "translated:command.workspace.files.focus",
      focusSearch: "translated:command.workspace.search.focus",
      focusGlossary: "translated:command.workspace.glossary.focus",
      toggleSettings: "translated:command.workspace.settings.toggle"
    });
  });

  it("keeps Workspace command definitions independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/workspaceCommands.ts", "utf8");

    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });
});
