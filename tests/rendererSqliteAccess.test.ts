import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["src/renderer", "src/preload"];
const forbiddenPatterns = [
  /\bfrom\s+["']sqlite3["']/,
  /\brequire\(\s*["']sqlite3["']\s*\)/,
  /\bfrom\s+["']better-sqlite3["']/,
  /\brequire\(\s*["']better-sqlite3["']\s*\)/,
  /\bfrom\s+["']node:sqlite["']/,
  /\brequire\(\s*["']node:sqlite["']\s*\)/,
  /\bfrom\s+["'][^"']*main\/projectDatabase["']/,
  /\brequire\(\s*["'][^"']*main\/projectDatabase["']\s*\)/,
  /\bfrom\s+["'][^"']*main\/glossaryStore["']/,
  /\brequire\(\s*["'][^"']*main\/glossaryStore["']\s*\)/
];

async function listSourceFiles(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listSourceFiles(entryPath);
      }

      if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) {
        return [];
      }

      return [entryPath];
    })
  );

  return files.flat();
}

describe("renderer and preload sqlite access", () => {
  it("does not import sqlite libraries outside the main process", async () => {
    const sourceFiles = (
      await Promise.all(sourceRoots.map(listSourceFiles))
    ).flat();

    for (const sourceFile of sourceFiles) {
      const source = await fs.readFile(sourceFile, "utf8");
      expect(
        forbiddenPatterns.some((pattern) => pattern.test(source)),
        `${sourceFile} must not import sqlite directly`
      ).toBe(false);
    }
  });
});
