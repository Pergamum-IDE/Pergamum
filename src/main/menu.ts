import {
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions
} from "electron";
import { APPLICATION_MENU_CHANNELS } from "../shared/api";
import {
  applicationCommandIds,
  editorCommandIds,
  isFileMenuCommandId,
  type FileMenuCommandId
} from "../shared/commandIds";
import { t, type Language, type TranslationKey } from "../shared/i18n";
import { loadSettings } from "./settingsStore";

type MenuRole = NonNullable<MenuItemConstructorOptions["role"]>;
type ApplicationMenuWebContents = Pick<
  BrowserWindow["webContents"],
  "isDestroyed" | "send"
>;

export interface ApplicationMenuTargetWindow {
  isDestroyed(): boolean;
  readonly webContents: ApplicationMenuWebContents;
}

export interface ApplicationMenuOptions {
  getMainWindow(): ApplicationMenuTargetWindow | null;
}

const applicationName = "Pergamum";

function label(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>
): string {
  return t(language, key, values);
}

function roleItem(
  role: MenuRole,
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>
): MenuItemConstructorOptions {
  return {
    role,
    label: label(language, key, values)
  };
}

function commandMenuItem(
  commandId: FileMenuCommandId,
  language: Language,
  key: TranslationKey,
  options: ApplicationMenuOptions
): MenuItemConstructorOptions {
  return {
    label: label(language, key),
    click: () => {
      sendApplicationMenuCommand(options.getMainWindow, commandId);
    }
  };
}

function macApplicationMenu(language: Language): MenuItemConstructorOptions {
  const appName = applicationName;

  return {
    label: appName,
    submenu: [
      roleItem("about", language, "menu.aboutPergamum"),
      { type: "separator" },
      roleItem("services", language, "menu.services"),
      { type: "separator" },
      roleItem("hide", language, "menu.hide", { appName }),
      roleItem("hideOthers", language, "menu.hideOthers"),
      roleItem("unhide", language, "menu.showAll"),
      { type: "separator" },
      roleItem("quit", language, "menu.quit", { appName })
    ]
  };
}

function fileMenu(
  language: Language,
  platform: NodeJS.Platform,
  options: ApplicationMenuOptions
): MenuItemConstructorOptions {
  const appName = applicationName;
  const commandItems: MenuItemConstructorOptions[] = [
    commandMenuItem(
      applicationCommandIds.openProject,
      language,
      "menu.openProject",
      options
    ),
    commandMenuItem(
      editorCommandIds.openMarkdownDocument,
      language,
      "menu.openMarkdownFile",
      options
    ),
    commandMenuItem(
      editorCommandIds.saveDocument,
      language,
      "menu.save",
      options
    ),
    commandMenuItem(
      applicationCommandIds.toggleRecentProjects,
      language,
      "menu.recentProjects",
      options
    )
  ];

  return {
    label: label(language, "menu.file"),
    submenu:
      platform === "darwin"
        ? [
            ...commandItems,
            { type: "separator" },
            roleItem("close", language, "menu.close")
          ]
        : [
            ...commandItems,
            { type: "separator" },
            roleItem("quit", language, "menu.quit", { appName })
          ]
  };
}

function editMenu(language: Language): MenuItemConstructorOptions {
  return {
    label: label(language, "menu.edit"),
    submenu: [
      roleItem("undo", language, "menu.undo"),
      roleItem("redo", language, "menu.redo"),
      { type: "separator" },
      roleItem("cut", language, "menu.cut"),
      roleItem("copy", language, "menu.copy"),
      roleItem("paste", language, "menu.paste"),
      { type: "separator" },
      roleItem("selectAll", language, "menu.selectAll")
    ]
  };
}

function viewMenu(language: Language): MenuItemConstructorOptions {
  return {
    label: label(language, "menu.view"),
    submenu: [
      roleItem("reload", language, "menu.reload"),
      roleItem("forceReload", language, "menu.forceReload"),
      roleItem("toggleDevTools", language, "menu.toggleDevTools"),
      { type: "separator" },
      roleItem("resetZoom", language, "menu.actualSize"),
      roleItem("zoomIn", language, "menu.zoomIn"),
      roleItem("zoomOut", language, "menu.zoomOut"),
      { type: "separator" },
      roleItem("togglefullscreen", language, "menu.toggleFullScreen")
    ]
  };
}

function macWindowMenu(language: Language): MenuItemConstructorOptions {
  return {
    label: label(language, "menu.window"),
    submenu: [
      roleItem("minimize", language, "menu.minimize"),
      roleItem("zoom", language, "menu.zoom"),
      { type: "separator" },
      roleItem("front", language, "menu.bringAllToFront")
    ]
  };
}

function helpMenu(language: Language): MenuItemConstructorOptions {
  return {
    role: "help",
    label: label(language, "menu.help"),
    submenu: [roleItem("about", language, "menu.aboutPergamum")]
  };
}

export function sendApplicationMenuCommand(
  getMainWindow: () => ApplicationMenuTargetWindow | null,
  commandId: string
): boolean {
  if (!isFileMenuCommandId(commandId)) {
    return false;
  }

  const window = getMainWindow();

  if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
    return false;
  }

  window.webContents.send(APPLICATION_MENU_CHANNELS.command, commandId);
  return true;
}

export function buildApplicationMenu(
  language: Language,
  options: ApplicationMenuOptions,
  platform: NodeJS.Platform = process.platform
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    ...(platform === "darwin" ? [macApplicationMenu(language)] : []),
    fileMenu(language, platform, options),
    editMenu(language),
    viewMenu(language),
    ...(platform === "darwin" ? [macWindowMenu(language)] : []),
    helpMenu(language)
  ];

  return template;
}

export function createApplicationMenu(
  language: Language,
  options: ApplicationMenuOptions,
  platform: NodeJS.Platform = process.platform
): Menu {
  return Menu.buildFromTemplate(
    buildApplicationMenu(language, options, platform)
  );
}

export async function installApplicationMenu(
  options: ApplicationMenuOptions
): Promise<void> {
  const settings = await loadSettings();

  Menu.setApplicationMenu(createApplicationMenu(settings.language, options));
}
