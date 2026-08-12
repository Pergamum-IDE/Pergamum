import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import {
  createGlossaryCommandTitles,
  glossaryCommandIds,
  registerGlossaryCommands
} from "../../src/renderer/glossaryCommands";

describe("glossary commands", () => {
  it("registers the Glossary entry open command", () => {
    const registry = new CommandRegistry();

    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry: () => true
      },
      {
        openEntry: "Open glossary entry"
      }
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      glossaryCommandIds.openEntry
    ]);
    expect(registry.get(glossaryCommandIds.openEntry)?.title).toBe(
      "Open glossary entry"
    );
  });

  it("opens Glossary entries through a typed command argument", async () => {
    const registry = new CommandRegistry();
    const openGlossaryEntry = vi.fn(async () => true);

    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry
      },
      {
        openEntry: "Open glossary entry"
      }
    );

    await expect(
      registry.execute(
        glossaryCommandIds.openEntry,
        "018f4b8c-7a2b-7c3d-8e4f-123456789abc"
      )
    ).resolves.toBe(true);
    expect(openGlossaryEntry).toHaveBeenCalledWith(
      "018f4b8c-7a2b-7c3d-8e4f-123456789abc"
    );
  });

  it("creates localized command titles outside the registry", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createGlossaryCommandTitles(translate)).toEqual({
      openEntry: "translated:command.glossary.entry.open"
    });
  });

  it("keeps Glossary command definitions independent from React and DOM APIs", () => {
    const source = readFileSync("src/renderer/glossaryCommands.ts", "utf8");

    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });
});
