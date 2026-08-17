import { describe, expect, it } from "vitest";
import {
  CommandDisabledError,
  CommandRegistry
} from "../../src/shared/commandRegistry";
import type { Translate } from "../../src/shared/i18n";
import {
  createGlossaryOccurrencesCommandTitles,
  glossaryOccurrenceTrackingCommandWhen,
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
    registry.setCommandContextProvider(() => ({
      "glossary.occurrences.tracking.active": true
    }));

    await registry.execute(glossaryOccurrencesCommandIds.previous);
    await registry.execute(glossaryOccurrencesCommandIds.next);
    await registry.execute(glossaryOccurrencesCommandIds.openEntry);
    await registry.execute(glossaryOccurrencesCommandIds.closeTracking);

    expect(calls).toEqual(["previous", "next", "openEntry", "closeTracking"]);
  });

  it("returns false as a no-op instead of throwing when the controller reports no active session", async () => {
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
    // Registry-level `when` (#128) gates on live tracking state; this test
    // exercises the controller's own graceful no-op handling, so keep the
    // live context permissive and let the controller report the no-op.
    registry.setCommandContextProvider(() => ({
      "glossary.occurrences.tracking.active": true
    }));

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

  it("declares previous/next/tracking.close's when as tracking.active, but leaves openEntry ungated (#128 initial scope)", () => {
    expect(glossaryOccurrenceTrackingCommandWhen).toEqual({
      key: "glossary.occurrences.tracking.active"
    });
  });

  it("blocks previous/next/closeTracking execution via the registry when tracking is inactive", async () => {
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
    registry.setCommandContextProvider(() => ({
      "glossary.occurrences.tracking.active": false
    }));

    await expect(
      registry.execute(glossaryOccurrencesCommandIds.previous)
    ).rejects.toBeInstanceOf(CommandDisabledError);
    await expect(
      registry.execute(glossaryOccurrencesCommandIds.next)
    ).rejects.toBeInstanceOf(CommandDisabledError);
    await expect(
      registry.execute(glossaryOccurrencesCommandIds.closeTracking)
    ).rejects.toBeInstanceOf(CommandDisabledError);

    // openEntry has no `when` in this issue's initial scope, so it still runs.
    await registry.execute(glossaryOccurrencesCommandIds.openEntry);

    expect(calls).toEqual(["openEntry"]);
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
