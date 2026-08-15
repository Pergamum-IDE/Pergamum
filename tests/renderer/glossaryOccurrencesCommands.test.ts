import { describe, expect, it } from "vitest";
import { CommandRegistry } from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import {
  createGlossaryOccurrencesCommandTitles,
  glossaryOccurrencesCommandIds,
  registerGlossaryOccurrencesCommands
} from "../../src/renderer/glossaryOccurrencesCommands";

const translate: Translate = (key) => key;

describe("glossary occurrences commands", () => {
  const titles = {
    previous: "Previous occurrence",
    next: "Next occurrence",
    openEntry: "Open entry",
    closeTracking: "Close tracking"
  };

  it("registers previous, next, openEntry, and closeTracking commands", () => {
    const registry = new CommandRegistry();

    registerGlossaryOccurrencesCommands(
      registry,
      {
        navigateToPreviousOccurrence: () => false,
        navigateToNextOccurrence: () => false,
        openTrackedGlossaryEntry: () => false,
        closeGlossaryOccurrenceTracking: () => false
      },
      titles
    );

    expect(registry.list().map((command) => command.id)).toEqual([
      "glossary.occurrences.previous",
      "glossary.occurrences.next",
      "glossary.occurrences.entry.open",
      "glossary.occurrences.tracking.close"
    ]);
  });

  it("routes each command to its controller method", async () => {
    const registry = new CommandRegistry();
    const calls: string[] = [];

    registerGlossaryOccurrencesCommands(
      registry,
      {
        navigateToPreviousOccurrence: () => {
          calls.push("previous");
          return true;
        },
        navigateToNextOccurrence: () => {
          calls.push("next");
          return true;
        },
        openTrackedGlossaryEntry: () => {
          calls.push("openEntry");
          return true;
        },
        closeGlossaryOccurrenceTracking: () => {
          calls.push("closeTracking");
          return true;
        }
      },
      titles
    );

    await registry.execute(glossaryOccurrencesCommandIds.previous);
    await registry.execute(glossaryOccurrencesCommandIds.next);
    await registry.execute(glossaryOccurrencesCommandIds.openEntry);
    await registry.execute(glossaryOccurrencesCommandIds.closeTracking);

    expect(calls).toEqual(["previous", "next", "openEntry", "closeTracking"]);
  });

  it("returns false as a no-op instead of throwing when there is no active tracking session", async () => {
    const registry = new CommandRegistry();

    registerGlossaryOccurrencesCommands(
      registry,
      {
        navigateToPreviousOccurrence: () => false,
        navigateToNextOccurrence: () => false,
        openTrackedGlossaryEntry: () => false,
        closeGlossaryOccurrenceTracking: () => false
      },
      titles
    );

    await expect(
      registry.execute(glossaryOccurrencesCommandIds.previous)
    ).resolves.toBe(false);
    await expect(
      registry.execute(glossaryOccurrencesCommandIds.next)
    ).resolves.toBe(false);
    await expect(
      registry.execute(glossaryOccurrencesCommandIds.openEntry)
    ).resolves.toBe(false);
    await expect(
      registry.execute(glossaryOccurrencesCommandIds.closeTracking)
    ).resolves.toBe(false);
  });

  it("derives command titles through translate", () => {
    expect(createGlossaryOccurrencesCommandTitles(translate)).toEqual({
      previous: "command.glossary.occurrences.previous",
      next: "command.glossary.occurrences.next",
      openEntry: "command.glossary.occurrences.entry.open",
      closeTracking: "command.glossary.occurrences.tracking.close"
    });
  });
});
