import { beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => ({
  getPath: vi.fn(() => "C:\\fake-userData")
}));

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock("electron", () => ({
  app: {
    getPath: electronMock.getPath
  }
}));

vi.mock("node:fs", () => ({
  promises: fsMock
}));

import {
  loadSettings,
  parseSaveApplicationSettingsRequest,
  saveApplicationSettings
} from "../../src/main/settingsStore";
import type { SaveApplicationSettingsRequest } from "../../src/shared/settings";
import { getCatalogDefaultValue } from "../../src/shared/settingsCatalog";

function onDiskSettings(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    preview: { renderer: "markdown" },
    workbench: {
      language: "ja",
      statusBar: { visible: true },
      advancedSettings: { enabled: false }
    },
    editor: {},
    files: {
      newFile: {
        lineEnding: "lf",
        encoding: "utf8"
      }
    },
    recentProjects: [],
    ...overrides
  });
}

function validSaveRequest(
  overrides: Partial<SaveApplicationSettingsRequest> = {}
): SaveApplicationSettingsRequest {
  return {
    workbench: {
      language: "ja",
      statusBar: { visible: true },
      advancedSettings: { enabled: false }
    },
    editor: {},
    files: {
      newFile: {
        lineEnding: "lf",
        encoding: "utf8"
      }
    },
    ...overrides
  };
}

describe("settingsStore Application Settings core controls read path (#195)", () => {
  beforeEach(() => {
    fsMock.readFile.mockReset();
    fsMock.writeFile.mockReset();
    fsMock.mkdir.mockReset();
  });

  it("loads catalog-backed defaults when settings.json is missing", async () => {
    fsMock.readFile.mockRejectedValue(
      Object.assign(new Error("not found"), { code: "ENOENT" })
    );

    const settings = await loadSettings();

    expect(settings.workbench.advancedSettings.enabled).toBe(
      getCatalogDefaultValue("workbench.advancedSettings.enabled")
    );
    expect(settings.editor.fontFamily).toBeUndefined();
    expect(settings.files.newFile).toEqual({
      lineEnding: getCatalogDefaultValue("files.newFile.lineEnding"),
      encoding: getCatalogDefaultValue("files.newFile.encoding")
    });
  });

  it("reads valid advanced flag, editor font, line ending, and encoding values", async () => {
    fsMock.readFile.mockResolvedValue(
      onDiskSettings({
        workbench: {
          language: "ja",
          statusBar: { visible: true },
          advancedSettings: { enabled: true }
        },
        editor: { fontFamily: "Fira Code" },
        files: {
          newFile: {
            lineEnding: "crlf",
            encoding: "utf8"
          }
        }
      })
    );

    const settings = await loadSettings();

    expect(settings.workbench.advancedSettings.enabled).toBe(true);
    expect(settings.editor.fontFamily).toBe("Fira Code");
    expect(settings.files.newFile).toEqual({
      lineEnding: "crlf",
      encoding: "utf8"
    });
  });

  it("falls back or omits invalid values without failing startup", async () => {
    fsMock.readFile.mockResolvedValue(
      onDiskSettings({
        workbench: {
          language: "ja",
          statusBar: { visible: true },
          advancedSettings: { enabled: "yes" }
        },
        editor: { fontFamily: 'Fira Code"; color: red' },
        files: {
          newFile: {
            lineEnding: "cr",
            encoding: "shift_jis"
          }
        }
      })
    );

    const settings = await loadSettings();

    expect(settings.workbench.advancedSettings.enabled).toBe(false);
    expect(settings.editor.fontFamily).toBeUndefined();
    expect(settings.files.newFile).toEqual({
      lineEnding: "lf",
      encoding: "utf8"
    });
  });
});

describe("settingsStore Application Settings core controls write path (#195)", () => {
  beforeEach(() => {
    fsMock.readFile.mockReset();
    fsMock.writeFile.mockReset();
    fsMock.mkdir.mockReset();
    fsMock.writeFile.mockResolvedValue(undefined);
    fsMock.mkdir.mockResolvedValue(undefined);
  });

  it("writes workbench/editor/files settings while preserving preview and recent projects", async () => {
    fsMock.readFile.mockResolvedValue(
      onDiskSettings({
        recentProjects: [{ path: "C:\\proj", name: "proj" }]
      })
    );

    await saveApplicationSettings(
      validSaveRequest({
        workbench: {
          language: "en",
          statusBar: { visible: false },
          advancedSettings: { enabled: true },
          fontFamily: "Inter"
        },
        editor: { fontFamily: "Fira Code" },
        files: {
          newFile: {
            lineEnding: "crlf",
            encoding: "utf8"
          }
        }
      })
    );

    const [, writtenContent] = fsMock.writeFile.mock.calls[0] as [
      string,
      string
    ];
    const written = JSON.parse(writtenContent);

    expect(written.preview).toEqual({ renderer: "markdown" });
    expect(written.recentProjects).toEqual([{ path: "C:\\proj", name: "proj" }]);
    expect(written.workbench).toEqual({
      language: "en",
      statusBar: { visible: false },
      advancedSettings: { enabled: true },
      fontFamily: "Inter"
    });
    expect(written.editor).toEqual({ fontFamily: "Fira Code" });
    expect(written.files).toEqual({
      newFile: {
        lineEnding: "crlf",
        encoding: "utf8"
      }
    });
  });

  it("rejects invalid advanced settings, editor font, line ending, and encoding save values", () => {
    for (const invalidRequest of [
      validSaveRequest({
        workbench: {
          language: "ja",
          statusBar: { visible: true },
          advancedSettings: { enabled: "yes" as unknown as boolean }
        }
      }),
      validSaveRequest({
        editor: { fontFamily: 'Fira Code"; color: red' }
      }),
      validSaveRequest({
        files: { newFile: { lineEnding: "cr" as "lf", encoding: "utf8" } }
      }),
      validSaveRequest({
        files: {
          newFile: { lineEnding: "lf", encoding: "shift_jis" as "utf8" }
        }
      })
    ]) {
      expect(() =>
        parseSaveApplicationSettingsRequest(invalidRequest)
      ).toThrow("Invalid application settings.");
    }

    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });
});
