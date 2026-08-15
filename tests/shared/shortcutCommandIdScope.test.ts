import { describe, expect, it } from "vitest";
import { knownDebugLogCommandIds } from "../../src/shared/debugLog";
import {
  applicationCommandIds,
  editorCommandIds,
  fileMenuCommandIds
} from "../../src/shared/commandIds";

describe("shortcut command ID scope", () => {
  it("does not add shortcut-specific Command IDs", () => {
    const commandIds = [
      applicationCommandIds.openProject,
      applicationCommandIds.toggleRecentProjects,
      editorCommandIds.openMarkdownDocument,
      editorCommandIds.saveDocument,
      ...fileMenuCommandIds,
      ...knownDebugLogCommandIds
    ];

    expect(commandIds.join("\n")).not.toContain("shortcut.");
    expect(commandIds.join("\n")).not.toContain("keyboard.");
  });
});
