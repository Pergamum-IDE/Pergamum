import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import {
  applicationCommandIds,
  createApplicationCommandTitles,
  registerApplicationCommands
} from "../../src/renderer/applicationCommands";

const titles = {
  openProject: "Open Project",
  toggleRecentProjects: "Toggle Recent Projects"
};

describe("application commands", () => {
  it("registers app-level project and Recent Projects commands", () => {
    const registry = new CommandRegistry();

    registerApplicationCommands(
      registry,
      {
        openProject: () => undefined,
        toggleRecentProjects: () => undefined
      },
      titles
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      "workspace.project.open",
      "workspace.recentProjects.toggle"
    ]);
  });

  it("routes app commands to their controller methods", async () => {
    const registry = new CommandRegistry();
    const openProject = vi.fn();
    const toggleRecentProjects = vi.fn();

    registerApplicationCommands(
      registry,
      {
        openProject,
        toggleRecentProjects
      },
      titles
    );

    await registry.execute(applicationCommandIds.openProject);
    await registry.execute(applicationCommandIds.toggleRecentProjects);

    expect(openProject).toHaveBeenCalledTimes(1);
    expect(toggleRecentProjects).toHaveBeenCalledTimes(1);
  });

  it("creates localized command titles from command i18n keys", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createApplicationCommandTitles(translate)).toEqual({
      openProject: "translated:command.workspace.project.open",
      toggleRecentProjects: "translated:command.workspace.recentProjects.toggle"
    });
  });

  it("does not introduce toolbar-prefixed Command IDs", () => {
    expect(Object.values(applicationCommandIds)).not.toContain("toolbar");
    expect(Object.values(applicationCommandIds).join("\n")).not.toContain(
      "toolbar."
    );
  });

  it("keeps application command definitions independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/applicationCommands.ts", "utf8");

    expect(source).toContain("../shared/commandIds");
    expect(source).not.toContain("defineCommandId(");
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });
});
