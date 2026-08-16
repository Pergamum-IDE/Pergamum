import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbOperationLogSource = readSource("src/main/dbOperationLog.ts");
const glossaryStoreSource = readSource("src/main/glossaryStore.ts");
const projectDatabaseSource = readSource("src/main/projectDatabase.ts");

describe("DB operation logging source checks", () => {
  it("keeps DB log helper inputs away from unsafe data vocabulary", () => {
    expect(dbOperationLogSource).not.toMatch(
      /\b(sql|parameters|markdownContent|glossarySurface|glossaryDescription|projectRootPath|filePath|rowData|settingsJson|projectConfigJson)\b/
    );
    expect(dbOperationLogSource).not.toContain("Record<string, unknown>");
  });

  it("keeps store and database instrumentation behind the typed helper", () => {
    expect(glossaryStoreSource).not.toContain("logger.log({");
    expect(projectDatabaseSource).not.toContain("logger.log({");
    expect(glossaryStoreSource).toContain("withDbOperationLog(");
    expect(projectDatabaseSource).toContain("withDbOperationLog(");
  });

  it("does not instrument settings, project config, or recent projects", () => {
    for (const filePath of [
      "src/main/settingsStore.ts",
      "src/main/projectConfigStore.ts",
      "src/main/settingsIpc.ts",
      "src/main/projectIpc.ts"
    ]) {
      const source = readSource(filePath);

      expect(source).not.toContain("withDbOperationLog");
      expect(source).not.toContain("logDbOperationSkipped");
      expect(source).not.toContain("db.operation.");
      expect(source).not.toContain("dbOperation:");
    }
  });

  it("does not add DB logging to scan or occurrence paths", () => {
    for (const filePath of [
      "src/renderer/useGlossaryEntriesForMatching.ts",
      "src/renderer/glossaryOccurrenceTracking.ts",
      "src/shared/glossarySurfaceMatching.ts"
    ]) {
      const source = readSource(filePath);

      expect(source).not.toContain("withDbOperationLog");
      expect(source).not.toContain("db.operation.");
      expect(source).not.toContain("dbOperation:");
    }
  });

  it("does not add remote telemetry or a migration DB operation", () => {
    for (const source of [
      dbOperationLogSource,
      glossaryStoreSource,
      projectDatabaseSource
    ]) {
      expect(source).not.toContain("telemetry");
      expect(source).not.toContain('dbOperation: "migrate"');
      expect(source).not.toContain("dbOperation: 'migrate'");
    }
  });
});

function readSource(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
