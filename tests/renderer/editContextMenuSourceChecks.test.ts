import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { editCommandIds } from "../../src/shared/commandIds";

const sourceRoots = ["src/main", "src/preload", "src/renderer", "src/shared"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    const stat = statSync(filePath);

    return stat.isDirectory() ? sourceFiles(filePath) : [filePath];
  });
}

function allSourceText(): string {
  return sourceRoots
    .flatMap(sourceFiles)
    .filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
}

function sourceText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("edit context menu source checks", () => {
  it("does not add shortcut or clipboard implementations", () => {
    const source = allSourceText();

    expect(source).not.toContain("globalShortcut");
    expect(source).not.toMatch(/addEventListener\(["']keydown/);
    expect(source).not.toContain("onKeyDown");
    expect(source).not.toContain("document.execCommand");
    expect(source).not.toContain("navigator.clipboard");
    expect(source).not.toContain("selectionchange");
    expect(source).not.toContain("clipboardBuffer");
  });

  it("keeps Edit command strings defined only in shared command IDs", () => {
    const source = allSourceText();

    for (const commandId of editCommandIds) {
      const exactStringOccurrences =
        source.match(new RegExp(`["']${commandId}["']`, "g")) ?? [];

      expect(exactStringOccurrences).toHaveLength(1);
    }
  });

  it("keeps context menu route logs free of operation and itemCount details", () => {
    const source = [
      sourceText("src/main/contextMenuIpc.ts"),
      sourceText("src/renderer/editContextMenuBridge.ts")
    ].join("\n");

    expect(source).not.toContain("operation");
    expect(source).not.toContain("itemCount");
  });

  it("does not bridge Application menu Edit roles into the new context/edit route", () => {
    const source = sourceText("src/main/menu.ts");

    expect(source).toContain('roleItem("cut"');
    expect(source).toContain('roleItem("copy"');
    expect(source).toContain('roleItem("paste"');
    expect(source).toContain('roleItem("selectAll"');
    expect(source).not.toContain("contextMenu.");
    expect(source).not.toContain("edit.command.");
  });
});
