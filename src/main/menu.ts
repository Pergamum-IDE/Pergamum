import { Menu, type MenuItemConstructorOptions } from "electron";
import { t, type Language, type TranslationKey } from "../shared/i18n";
import { loadSettings } from "./settingsStore";

type MenuRole = NonNullable<MenuItemConstructorOptions["role"]>;
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

function fileMenu(language: Language): MenuItemConstructorOptions {
  const appName = applicationName;

  return {
    label: label(language, "menu.file"),
    submenu:
      process.platform === "darwin"
        ? [roleItem("close", language, "menu.close")]
        : [roleItem("quit", language, "menu.quit", { appName })]
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

export function buildApplicationMenu(language: Language): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin" ? [macApplicationMenu(language)] : []),
    fileMenu(language),
    editMenu(language),
    viewMenu(language),
    ...(process.platform === "darwin" ? [macWindowMenu(language)] : []),
    helpMenu(language)
  ];

  return Menu.buildFromTemplate(template);
}

export async function installApplicationMenu(): Promise<void> {
  const settings = await loadSettings();

  Menu.setApplicationMenu(buildApplicationMenu(settings.language));
}
