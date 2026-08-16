import { describe, expect, it } from "vitest";
import {
  sanitizeDebugLogDetails,
  sanitizeErrorForDebugLog,
  type DebugLogRuntimeDetails
} from "../../src/main/debugLogSanitizer";

const runtime: DebugLogRuntimeDetails = {
  appVersion: "0.1.0",
  platform: "win32",
  arch: "x64",
  locale: "ja",
  electronVersion: "39.8.10",
  nodeVersion: "20.19.11",
  debugMode: true
};

function context(knownRefs: {
  projectRefs?: readonly string[];
  documentRefs?: readonly string[];
} = {}) {
  const projectRefs = new Set(knownRefs.projectRefs ?? []);
  const documentRefs = new Set(knownRefs.documentRefs ?? []);

  return {
    runtime,
    isKnownProjectRef: (projectRef: string) => projectRefs.has(projectRef),
    isKnownDocumentRef: (documentRef: string) => documentRefs.has(documentRef)
  };
}

describe("debug log details sanitizer", () => {
  it("drops unknown detail keys without writing their names or values", () => {
    const details = sanitizeDebugLogDetails(
      {
        documentRef: "document:session:001",
        fileName: "secret-title.md",
        absolutePath: "C:\\Users\\name\\Documents\\secret-title.md",
        itemCount: 12
      },
      context({
        documentRefs: ["document:session:001"]
      })
    );

    expect(details).toEqual({
      documentRef: "document:session:001",
      droppedKeyCount: 3
    });
    expect(JSON.stringify(details)).not.toContain("fileName");
    expect(JSON.stringify(details)).not.toContain("secret-title");
    expect(JSON.stringify(details)).not.toContain("absolutePath");
    expect(details).not.toHaveProperty("itemCount");
  });

  it("normalizes enum-like values and known catalogs", () => {
    const details = sanitizeDebugLogDetails(
      {
        commandId: "unknown.command.id",
        statusKey: "status.notInCatalog",
        operation: "publish",
        result: "partial",
        editorIdKind: "custom",
        reason: "custom_reason",
        trigger: "shortcut",
        saveTargetKind: "custom_target"
      },
      context()
    );

    expect(details).toEqual({
      commandId: "unknown",
      statusKey: "unknown",
      operation: "unknown",
      result: "unknown",
      editorIdKind: "unknown",
      reason: "unknown",
      trigger: "unknown",
      saveTargetKind: "unknown"
    });
  });

  it("accepts only safe IME diagnostic booleans", () => {
    const details = sanitizeDebugLogDetails(
      {
        hasPendingSave: true,
        hasScheduledSave: false,
        isComposing: true,
        isDirty: true,
        canSave: false,
        hasRelatedTarget: false,
        nextTargetInsideAppShell: true,
        documentHasFocus: "yes",
        willClearPendingSave: true
      },
      context()
    );

    expect(details).toEqual({
      hasPendingSave: true,
      hasScheduledSave: false,
      isComposing: true,
      isDirty: true,
      canSave: false,
      hasRelatedTarget: false,
      nextTargetInsideAppShell: true,
      willClearPendingSave: true
    });
  });

  it("accepts safe context menu diagnostics and drops disallowed detail keys", () => {
    const details = sanitizeDebugLogDetails(
      {
        interactionId: "contextMenu.12",
        commandId: "editor.selection.cut",
        requestedSurface: "markdownEditor",
        delegatedSurface: "unknownEditable",
        hasSelection: false,
        itemCount: 4,
        clipboardText: "secret",
        selectedText: "secret"
      },
      context()
    );

    expect(details).toEqual({
      interactionId: "contextMenu.12",
      commandId: "editor.selection.cut",
      requestedSurface: "markdownEditor",
      delegatedSurface: "unknownEditable",
      hasSelection: false,
      droppedKeyCount: 3
    });
    expect(JSON.stringify(details)).not.toContain("secret");
    expect(details).not.toHaveProperty("itemCount");
  });

  it("normalizes unsupported surface strings to unknownEditable", () => {
    const details = sanitizeDebugLogDetails(
      {
        requestedSurface: "unsupported",
        delegatedSurface: "custom"
      },
      context()
    );

    expect(details).toEqual({
      requestedSurface: "unknownEditable",
      delegatedSurface: "unknownEditable"
    });
  });

  it("accepts safe DB operation diagnostics and drops unsafe DB details", () => {
    const details = sanitizeDebugLogDetails(
      {
        dbOperationId: "dbOperation.12",
        dbOperation: "read",
        dbEntityKind: "glossaryEntry",
        result: "succeeded",
        reason: "validation_failed",
        durationMs: 12.5,
        count: 0,
        sql: "SELECT * FROM glossary_entries",
        parameters: ["secret"],
        markdownContent: "本文",
        glossarySurface: "王都アルセリア",
        glossaryDescription: "首都",
        absolutePath: "C:\\Users\\name\\novel.md",
        rowData: { surface: "王都アルセリア" }
      },
      context()
    );

    expect(details).toEqual({
      dbOperationId: "dbOperation.12",
      dbOperation: "read",
      dbEntityKind: "glossaryEntry",
      result: "succeeded",
      reason: "validation_failed",
      durationMs: 12.5,
      count: 0,
      droppedKeyCount: 7
    });
    expect(JSON.stringify(details)).not.toContain("SELECT");
    expect(JSON.stringify(details)).not.toContain("secret");
    expect(JSON.stringify(details)).not.toContain("本文");
    expect(JSON.stringify(details)).not.toContain("王都");
    expect(JSON.stringify(details)).not.toContain("novel.md");
  });

  it("handles invalid DB enum details according to each catalog policy", () => {
    const details = sanitizeDebugLogDetails(
      {
        dbOperation: "migrate",
        dbEntityKind: "settings",
        reason: "custom_reason"
      },
      context()
    );

    expect(details).toEqual({
      dbEntityKind: "unknown",
      reason: "unknown",
      droppedKeyCount: 1
    });
    expect(details).not.toHaveProperty("dbOperation");
  });

  it("drops invalid DB operation IDs and counts", () => {
    const details = sanitizeDebugLogDetails(
      {
        dbOperationId: "db operation with spaces",
        count: -1
      },
      context()
    );

    expect(details).toBeUndefined();
  });

  it("uses main-process runtime values instead of renderer-provided versions", () => {
    const details = sanitizeDebugLogDetails(
      {
        appVersion: "renderer-version",
        locale: "renderer-locale",
        electronVersion: "renderer-electron",
        nodeVersion: "renderer-node",
        debugMode: false
      },
      context()
    );

    expect(details).toMatchObject({
      appVersion: runtime.appVersion,
      locale: runtime.locale,
      electronVersion: runtime.electronVersion,
      nodeVersion: runtime.nodeVersion,
      debugMode: true
    });
  });

  it("accepts only issued session-local opaque references", () => {
    const details = sanitizeDebugLogDetails(
      {
        projectRef: "project:session:001",
        documentRef: "document:session:999"
      },
      context({
        projectRefs: ["project:session:001"],
        documentRefs: ["document:session:001"]
      })
    );

    expect(details).toEqual({
      projectRef: "project:session:001",
      droppedKeyCount: 1
    });
  });

  it("sanitizes errors without message or stack summaries", () => {
    const error = new Error("C:\\Users\\name\\secret.md could not be opened");
    Object.assign(error, {
      code: "ENOENT",
      stack: "stack with C:\\Users\\name\\secret.md"
    });

    const sanitized = sanitizeErrorForDebugLog(error);

    expect(sanitized).toEqual({
      name: "Error",
      code: "ENOENT",
      category: "notFound"
    });
    expect(sanitized).not.toHaveProperty("messageSummary");
    expect(sanitized).not.toHaveProperty("stackSummary");
    expect(JSON.stringify(sanitized)).not.toContain("secret.md");
  });
});
