import { describe, expect, it } from "vitest";
import {
  debugLogDbEntityKinds,
  debugLogDbOperations,
  debugLogEventNames,
  debugLogReasons,
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

  it("includes count only as an allowlisted debug detail key", () => {
    type HasGenericCount = "count" extends keyof DebugLogDetails ? true : false;
    const hasGenericCount: HasGenericCount = true;

    expect(hasGenericCount).toBe(true);
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

  it("includes the DB operation debug events", () => {
    expect(debugLogEventNames).toEqual(
      expect.arrayContaining([
        "db.operation.started",
        "db.operation.succeeded",
        "db.operation.failed",
        "db.operation.skipped"
      ])
    );
  });

  it("defines the closed DB operation and entity catalogs", () => {
    expect([...debugLogDbOperations]).toEqual([
      "create",
      "read",
      "update",
      "delete",
      "upsert",
      "list",
      "count",
      "initialize",
      "transaction"
    ]);
    expect([...debugLogDbOperations]).not.toContain("migrate");
    expect([...debugLogDbOperations]).not.toContain("save");
    expect([...debugLogDbEntityKinds]).toEqual([
      "glossaryEntry",
      "glossaryForm",
      "database",
      "unknown"
    ]);
    expect([...debugLogDbEntityKinds]).not.toContain("settings");
    expect([...debugLogDbEntityKinds]).not.toContain("projectConfig");
    expect([...debugLogDbEntityKinds]).not.toContain("recentProject");
  });

  it("includes the DB skipped reason catalog values", () => {
    expect(debugLogReasons).toEqual(
      expect.arrayContaining([
        "validation_failed",
        "context_stale",
        "not_found",
        "no_changes",
        "database_unavailable",
        "transaction_inactive",
        "unknown"
      ])
    );
  });
});
