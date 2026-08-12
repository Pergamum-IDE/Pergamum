import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import {
  createGlossaryCommandTitles,
  glossaryCommandIds,
  registerGlossaryCommands
} from "../../src/renderer/glossaryCommands";

const bothCommandTitles = {
  openEntry: "Open glossary entry",
  createEntry: "Create glossary entry"
};

describe("glossary commands", () => {
  it("registers the Glossary entry open and create commands", () => {
    const registry = new CommandRegistry();

    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry: () => true,
        createGlossaryEntry: () => true
      },
      bothCommandTitles
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      glossaryCommandIds.openEntry,
      glossaryCommandIds.createEntry
    ]);
    expect(registry.get(glossaryCommandIds.openEntry)?.title).toBe(
      "Open glossary entry"
    );
    expect(registry.get(glossaryCommandIds.createEntry)?.title).toBe(
      "Create glossary entry"
    );
  });

  it("opens Glossary entries through a typed command argument", async () => {
    const registry = new CommandRegistry();
    const openGlossaryEntry = vi.fn(async () => true);

    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry,
        createGlossaryEntry: () => true
      },
      bothCommandTitles
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

  it("creates Glossary entries through a typed command argument", async () => {
    const registry = new CommandRegistry();
    const createGlossaryEntry = vi.fn(async () => true);
    const input = {
      kind: "place" as const,
      canonicalSurface: "王都",
      description: ""
    };

    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry: () => true,
        createGlossaryEntry
      },
      bothCommandTitles
    );

    await expect(
      registry.execute(glossaryCommandIds.createEntry, input)
    ).resolves.toBe(true);
    expect(createGlossaryEntry).toHaveBeenCalledWith(input);
  });

  it("creates localized command titles outside the registry", () => {
    const translate = vi.fn((key: string) => `translated:${key}`);

    expect(createGlossaryCommandTitles(translate)).toEqual({
      openEntry: "translated:command.glossary.entry.open",
      createEntry: "translated:command.glossary.entry.create"
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
