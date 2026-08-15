import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";
import { APPLICATION_MENU_CHANNELS } from "../../src/shared/api";
import {
  applicationCommandIds,
  editorCommandIds,
  fileMenuCommandIds
} from "../../src/shared/commandIds";

const electronMock = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((template: MenuItemConstructorOptions[]) => ({
    template
  })),
  setApplicationMenu: vi.fn(),
  getPath: vi.fn()
}));

vi.mock("electron", () => ({
  Menu: {
    buildFromTemplate: electronMock.buildFromTemplate,
    setApplicationMenu: electronMock.setApplicationMenu
  },
  app: {
    getPath: electronMock.getPath
  }
}));

import {
  buildApplicationMenu,
  sendApplicationMenuCommand,
  type ApplicationMenuOptions,
  type ApplicationMenuTargetWindow
} from "../../src/main/menu";

describe("application menu", () => {
  it("builds an application menu template", () => {
    const template = buildApplicationMenu("en", emptyMenuOptions(), "win32");

    expect(template.length).toBeGreaterThan(0);
    expect(findTopLevelMenu(template, "File")).toBeTruthy();
  });

  it("keeps Quit in the Windows and Linux File menus", () => {
    for (const platform of ["win32", "linux"] as const) {
      const fileItems = fileMenuItems(platform);

      expect(fileItems.some((item) => item.role === "quit")).toBe(true);
    }
  });

  it("keeps Quit out of the macOS File menu and in the macOS App menu", () => {
    const template = buildApplicationMenu("en", emptyMenuOptions(), "darwin");
    const fileItems = submenuItems(findTopLevelMenu(template, "File"));
    const appItems = submenuItems(findTopLevelMenu(template, "Pergamum"));

    expect(fileItems.some((item) => item.role === "quit")).toBe(false);
    expect(appItems.some((item) => item.role === "quit")).toBe(true);
  });

  it("preserves the macOS File menu Close role", () => {
    const fileItems = fileMenuItems("darwin");

    expect(fileItems.some((item) => item.role === "close")).toBe(true);
  });

  it("sends shared File menu command IDs from command menu items", () => {
    const { window, send } = menuWindowMock();
    const fileItems = fileMenuItems("win32", {
      getMainWindow: () => window
    });

    clickCommandItems(fileItems);

    expect(send.mock.calls.map((call) => call[1])).toEqual([
      applicationCommandIds.openProject,
      editorCommandIds.openMarkdownDocument,
      editorCommandIds.saveDocument,
      applicationCommandIds.toggleRecentProjects
    ]);
    expect(send.mock.calls.map((call) => call[1])).toEqual([
      ...fileMenuCommandIds
    ]);
  });

  it("rejects command IDs outside the File menu allowlist in main", () => {
    const { window, send } = menuWindowMock();

    expect(
      sendApplicationMenuCommand(() => window, "workspace.files.focus")
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not use focused-window routing", () => {
    const source = readFileSync("src/main/menu.ts", "utf8");

    expect(source).not.toContain("getFocusedWindow");
  });

  it("does nothing when the main window is unavailable", () => {
    expect(sendApplicationMenuCommand(() => null, editorCommandIds.saveDocument))
      .toBe(false);
  });

  it("does nothing when the main window is destroyed", () => {
    const { window, send } = menuWindowMock({ windowDestroyed: true });

    expect(
      sendApplicationMenuCommand(() => window, editorCommandIds.saveDocument)
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("does nothing when webContents is destroyed", () => {
    const { window, send } = menuWindowMock({ webContentsDestroyed: true });

    expect(
      sendApplicationMenuCommand(() => window, editorCommandIds.saveDocument)
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends menu commands over the application menu IPC channel", () => {
    const { window, send } = menuWindowMock();

    expect(
      sendApplicationMenuCommand(() => window, editorCommandIds.saveDocument)
    ).toBe(true);
    expect(send).toHaveBeenCalledWith(
      APPLICATION_MENU_CHANNELS.command,
      editorCommandIds.saveDocument
    );
  });
});

function emptyMenuOptions(): ApplicationMenuOptions {
  return {
    getMainWindow: () => null
  };
}

function findTopLevelMenu(
  template: readonly MenuItemConstructorOptions[],
  label: string
): MenuItemConstructorOptions {
  const menu = template.find((item) => item.label === label);

  if (!menu) {
    throw new Error(`Top-level menu was not found: ${label}`);
  }

  return menu;
}

function submenuItems(
  item: MenuItemConstructorOptions
): MenuItemConstructorOptions[] {
  if (!Array.isArray(item.submenu)) {
    throw new Error("Expected a submenu template.");
  }

  return item.submenu;
}

function fileMenuItems(
  platform: NodeJS.Platform,
  options: ApplicationMenuOptions = emptyMenuOptions()
): MenuItemConstructorOptions[] {
  return submenuItems(
    findTopLevelMenu(buildApplicationMenu("en", options, platform), "File")
  );
}

function clickCommandItems(items: readonly MenuItemConstructorOptions[]): void {
  for (const item of items) {
    if (item.click) {
      item.click({} as never, null as never, {} as never);
    }
  }
}

function menuWindowMock(options: {
  windowDestroyed?: boolean;
  webContentsDestroyed?: boolean;
} = {}): {
  window: ApplicationMenuTargetWindow;
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn();

  return {
    window: {
      isDestroyed: () => options.windowDestroyed ?? false,
      webContents: {
        isDestroyed: () => options.webContentsDestroyed ?? false,
        send
      }
    },
    send
  };
}
