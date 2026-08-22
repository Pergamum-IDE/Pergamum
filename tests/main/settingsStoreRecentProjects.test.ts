import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  RecentProject,
  RecordRecentProjectInput
} from "../../src/shared/settings";

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
  isRecentProjectFilePath,
  loadSettings,
  recordRecentProject
} from "../../src/main/settingsStore";

const defaultTimestamp = "2026-08-23T00:00:00.000Z";

function projectId(index: number): string {
  return `018f4b8c-7a2b-7c3d-8e4f-${String(index).padStart(12, "0")}`;
}

function recentProject(
  overrides: Partial<RecentProject> = {}
): RecentProject {
  return {
    projectId: projectId(1),
    projectName: "Metadata Project",
    projectFilePath: "C:\\Novel\\Novel.pergamum",
    projectRootPath: "C:\\Novel",
    schemaVersion: 1,
    lastOpenedAt: defaultTimestamp,
    ...overrides
  };
}

function recordInput(
  overrides: Partial<RecordRecentProjectInput> = {}
): RecordRecentProjectInput {
  return {
    projectId: projectId(1),
    projectName: "Metadata Project",
    projectFilePath: "C:\\Novel\\Novel.pergamum",
    projectRootPath: "C:\\Novel",
    schemaVersion: 1,
    ...overrides
  };
}

function onDiskSettings(recentProjects: unknown[]): string {
  return JSON.stringify({
    preview: { renderer: "markdown" },
    recentProjects
  });
}

function writtenSettings(): { recentProjects: RecentProject[] } {
  const [, writtenContent] = fsMock.writeFile.mock.calls[
    fsMock.writeFile.mock.calls.length - 1
  ] as [
    string,
    string
  ];

  return JSON.parse(writtenContent) as { recentProjects: RecentProject[] };
}

describe("settingsStore recent projects (#206 Slice 4)", () => {
  beforeEach(() => {
    vi.useRealTimers();
    fsMock.readFile.mockReset();
    fsMock.writeFile.mockReset();
    fsMock.mkdir.mockReset();
    fsMock.writeFile.mockResolvedValue(undefined);
    fsMock.mkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads only the new project identity format and drops the old path/name format", async () => {
    const validRecentProject = recentProject();
    fsMock.readFile.mockResolvedValue(
      onDiskSettings([
        { path: "C:\\Old", name: "Old Project" },
        validRecentProject
      ])
    );

    const settings = await loadSettings();

    expect(settings.recentProjects).toEqual([validRecentProject]);
  });

  it("records a new recent project with project metadata fields and lastOpenedAt", async () => {
    const openedAt = "2026-08-23T01:02:03.000Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(openedAt));
    fsMock.readFile.mockRejectedValue(
      Object.assign(new Error("not found"), { code: "ENOENT" })
    );

    const settings = await recordRecentProject(recordInput());

    expect(settings.recentProjects).toEqual([
      {
        ...recordInput(),
        lastOpenedAt: openedAt
      }
    ]);
    expect(writtenSettings().recentProjects).toEqual(settings.recentProjects);
  });

  it("updates the existing entry for the same projectId and moves it to the front", async () => {
    const openedAt = "2026-08-23T02:00:00.000Z";
    const firstProjectId = projectId(1);
    const existingFirst = recentProject({
      projectId: firstProjectId,
      projectName: "Old Metadata Name",
      projectFilePath: "C:\\Old\\Novel.pergamum",
      projectRootPath: "C:\\Old",
      lastOpenedAt: "2026-08-22T23:00:00.000Z"
    });
    const existingSecond = recentProject({
      projectId: projectId(2),
      projectName: "Second Project",
      projectFilePath: "C:\\Second\\Second.pergamum",
      projectRootPath: "C:\\Second",
      lastOpenedAt: "2026-08-22T22:00:00.000Z"
    });
    const updatedInput = recordInput({
      projectId: firstProjectId,
      projectName: "DB Metadata Name",
      projectFilePath: "D:\\Moved\\Novel.pergamum",
      projectRootPath: "D:\\Moved"
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(openedAt));
    fsMock.readFile.mockResolvedValue(
      onDiskSettings([existingSecond, existingFirst])
    );

    const settings = await recordRecentProject(updatedInput);

    expect(settings.recentProjects).toEqual([
      {
        ...updatedInput,
        lastOpenedAt: openedAt
      },
      existingSecond
    ]);
  });

  it("keeps the existing recent project limit when recording a new entry", async () => {
    const openedAt = "2026-08-23T03:00:00.000Z";
    const storedProjects = Array.from({ length: 10 }, (_, index) =>
      recentProject({
        projectId: projectId(index + 1),
        projectName: `Project ${index + 1}`,
        projectFilePath: `C:\\Project${index + 1}\\Project.pergamum`,
        projectRootPath: `C:\\Project${index + 1}`,
        lastOpenedAt:
          `2026-08-22T${String(23 - index).padStart(2, "0")}` +
          ":00:00.000Z"
      })
    );
    const newProject = recordInput({
      projectId: projectId(11),
      projectName: "Newest Project",
      projectFilePath: "C:\\Newest\\Newest.pergamum",
      projectRootPath: "C:\\Newest"
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(openedAt));
    fsMock.readFile.mockResolvedValue(onDiskSettings(storedProjects));

    const settings = await recordRecentProject(newProject);

    expect(settings.recentProjects).toHaveLength(10);
    expect(settings.recentProjects[0]).toEqual({
      ...newProject,
      lastOpenedAt: openedAt
    });
    expect(settings.recentProjects).not.toContainEqual(storedProjects[9]);
  });

  it("checks recent project membership by projectFilePath", async () => {
    const storedProject = recentProject();
    fsMock.readFile.mockResolvedValue(onDiskSettings([storedProject]));

    await expect(
      isRecentProjectFilePath(storedProject.projectFilePath)
    ).resolves.toBe(true);
    await expect(
      isRecentProjectFilePath(storedProject.projectRootPath)
    ).resolves.toBe(false);
  });
});
