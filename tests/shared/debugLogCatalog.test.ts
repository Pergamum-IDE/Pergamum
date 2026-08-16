import { describe, expect, it } from "vitest";
import {
  debugLogEventNames,
  type DebugLogDetails
} from "../../src/shared/debugLog";
import { contextMenuSurfaces } from "../../src/shared/editContextMenu";

describe("debug log catalog", () => {
  it("does not include removed or out-of-scope event names", () => {
    expect(debugLogEventNames).not.toContain("debug.mode.enabled");
    expect(debugLogEventNames).not.toContain("log.file.rotated");
  });

  it("does not add an initial warn event catalog", () => {
    const warnLikeEvents = debugLogEventNames.filter((eventName) =>
      eventName.includes(".warn")
    );

    expect(warnLikeEvents).toEqual([]);
  });

  it("does not include a generic count detail key", () => {
    type HasGenericCount = "count" extends keyof DebugLogDetails ? true : false;
    const hasGenericCount: HasGenericCount = false;

    expect(hasGenericCount).toBe(false);
  });

  it("includes the context menu and edit command debug events but not dismissed", () => {
    expect(debugLogEventNames).toEqual(
      expect.arrayContaining([
        "contextMenu.requested",
        "contextMenu.opened",
        "contextMenu.suppressed",
        "contextMenu.command.selected",
        "edit.command.requested",
        "edit.command.delegated",
        "edit.command.ignored",
        "edit.command.failed"
      ])
    );
    expect(debugLogEventNames).not.toContain("contextMenu.dismissed");
  });

  it("defines unknownEditable only as the fallback surface, not unsupported", () => {
    expect([...contextMenuSurfaces]).toEqual([
      "markdownEditor",
      "glossaryCanonicalInput",
      "glossaryDescription",
      "glossaryFormSurface",
      "unknownEditable"
    ]);
    expect([...contextMenuSurfaces]).not.toContain("unsupported");
  });
});
