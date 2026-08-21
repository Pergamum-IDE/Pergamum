import {
  BrowserWindow,
  ipcMain,
  Menu,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions
} from "electron";
import {
  CONTEXT_MENU_CHANNELS,
  EDIT_CHANNELS
} from "../shared/api";
import { editorCommandIds, type EditCommandId } from "../shared/commandIds";
import {
  editContextMenuItems,
  isContextMenuSurface,
  isEditContextMenuCommandId,
  isEditableContextSurface,
  type EditContextMenuPopupRequest,
  type EditableContextSurface,
  type ContextMenuSurface,
  type NativeEditDelegationRequest
} from "../shared/editContextMenu";
import { t, type Language } from "../shared/i18n";
import type { DebugLogger } from "./debugLogger";
import { loadSettings } from "./settingsStore";

type ContextMenuWebContents = Pick<
  Electron.WebContents,
  "isDestroyed" | "send"
>;

type NativeEditWebContents = ContextMenuWebContents &
  Pick<Electron.WebContents, "cut" | "copy" | "paste" | "selectAll">;

const safeInteractionIdPattern = /^[A-Za-z0-9_.-]{1,80}$/;

type ContextMenuSuppressionReason =
  | "invalid_command"
  | "unsupported_surface"
  | "window_unavailable"
  | "web_contents_destroyed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeInteractionId(value: unknown): string | null {
  return typeof value === "string" && safeInteractionIdPattern.test(value)
    ? value
    : null;
}

function partialInteractionIdDetails(
  rawRequest: unknown
): { readonly interactionId?: string } {
  if (!isRecord(rawRequest)) {
    return {};
  }

  const interactionId = sanitizeInteractionId(rawRequest.interactionId);

  return interactionId ? { interactionId } : {};
}

function safeContextMenuSurface(value: unknown): ContextMenuSurface {
  return isContextMenuSurface(value) ? value : "unknownEditable";
}

function popupRequestFromRaw(
  rawRequest: unknown
): EditContextMenuPopupRequest | null {
  if (!isRecord(rawRequest)) {
    return null;
  }

  const interactionId = sanitizeInteractionId(rawRequest.interactionId);
  const requestedSurface = rawRequest.requestedSurface;

  if (!interactionId || !isEditableContextSurface(requestedSurface)) {
    return null;
  }

  const rawItems = Array.isArray(rawRequest.items) ? rawRequest.items : [];
  const items = editContextMenuItems.map((definition) => {
    const rawItem = rawItems.find(
      (candidate) =>
        isRecord(candidate) && candidate.commandId === definition.commandId
    );

    return {
      commandId: definition.commandId,
      enabled: isRecord(rawItem) ? rawItem.enabled === true : false
    };
  });

  return {
    interactionId,
    requestedSurface,
    items
  };
}

function nativeEditRequestFromRaw(
  rawRequest: unknown
): NativeEditDelegationRequest | null {
  if (!isRecord(rawRequest)) {
    return null;
  }

  const interactionId = sanitizeInteractionId(rawRequest.interactionId);
  const commandId = rawRequest.commandId;
  const requestedSurface = rawRequest.requestedSurface;
  const delegatedSurface = rawRequest.delegatedSurface;

  if (
    !interactionId ||
    !isEditContextMenuCommandId(commandId) ||
    !isEditableContextSurface(requestedSurface) ||
    !isContextMenuSurface(delegatedSurface)
  ) {
    return null;
  }

  return {
    interactionId,
    commandId,
    requestedSurface,
    delegatedSurface,
    ...(typeof rawRequest.editorIdKind === "string"
      ? { editorIdKind: rawRequest.editorIdKind }
      : {}),
    ...(typeof rawRequest.hasSelection === "boolean"
      ? { hasSelection: rawRequest.hasSelection }
      : {})
  };
}

function enabledStateForCommand(
  request: EditContextMenuPopupRequest,
  commandId: EditCommandId
): boolean {
  return (
    request.items.find((item) => item.commandId === commandId)?.enabled ?? false
  );
}

export function buildEditContextMenuTemplate(
  request: EditContextMenuPopupRequest,
  language: Language,
  onSelect: (commandId: EditCommandId) => void
): MenuItemConstructorOptions[] {
  return editContextMenuItems.map((item) => ({
    label: t(language, item.labelKey),
    enabled: enabledStateForCommand(request, item.commandId),
    click: () => onSelect(item.commandId)
  }));
}

function logContextMenuOpened(
  debugLogger: Pick<DebugLogger, "log"> | undefined,
  request: EditContextMenuPopupRequest
): void {
  debugLogger?.log({
    level: "debug",
    event: "contextMenu.opened",
    details: {
      interactionId: request.interactionId,
      requestedSurface: request.requestedSurface
    }
  });
}

function logContextMenuCommandSelected(
  debugLogger: Pick<DebugLogger, "log"> | undefined,
  request: EditContextMenuPopupRequest,
  commandId: EditCommandId
): void {
  debugLogger?.log({
    level: "debug",
    event: "contextMenu.command.selected",
    details: {
      interactionId: request.interactionId,
      commandId,
      requestedSurface: request.requestedSurface
    }
  });
}

function logContextMenuSuppressed(
  debugLogger: Pick<DebugLogger, "log"> | undefined,
  details: {
    readonly interactionId?: string;
    readonly requestedSurface?: ContextMenuSurface;
    readonly reason: ContextMenuSuppressionReason;
  }
): void {
  debugLogger?.log({
    level: "debug",
    event: "contextMenu.suppressed",
    details: {
      ...(details.interactionId
        ? { interactionId: details.interactionId }
        : {}),
      ...(details.requestedSurface
        ? { requestedSurface: details.requestedSurface }
        : {}),
      result: "ignored",
      reason: details.reason
    }
  });
}

export function popupEditContextMenu(input: {
  request: EditContextMenuPopupRequest;
  language: Language;
  webContents: ContextMenuWebContents;
  window: BrowserWindow | null;
  debugLogger?: Pick<DebugLogger, "log">;
}): boolean {
  const { request, language, webContents, window, debugLogger } = input;

  if (!isEditableContextSurface(request.requestedSurface)) {
    logContextMenuSuppressed(debugLogger, {
      interactionId: request.interactionId,
      requestedSurface: safeContextMenuSurface(request.requestedSurface),
      reason: "unsupported_surface"
    });
    return false;
  }

  if (!window || window.isDestroyed()) {
    logContextMenuSuppressed(debugLogger, {
      interactionId: request.interactionId,
      requestedSurface: request.requestedSurface,
      reason: "window_unavailable"
    });
    return false;
  }

  if (webContents.isDestroyed()) {
    logContextMenuSuppressed(debugLogger, {
      interactionId: request.interactionId,
      requestedSurface: request.requestedSurface,
      reason: "web_contents_destroyed"
    });
    return false;
  }

  const menu = Menu.buildFromTemplate(
    buildEditContextMenuTemplate(request, language, (commandId) => {
      logContextMenuCommandSelected(debugLogger, request, commandId);

      if (!webContents.isDestroyed()) {
        webContents.send(CONTEXT_MENU_CHANNELS.commandSelected, {
          interactionId: request.interactionId,
          commandId,
          requestedSurface: request.requestedSurface
        });
      }
    })
  );

  try {
    menu.popup({ window });
  } catch {
    logContextMenuSuppressed(debugLogger, {
      interactionId: request.interactionId,
      requestedSurface: request.requestedSurface,
      reason: "window_unavailable"
    });
    return false;
  }

  logContextMenuOpened(debugLogger, request);
  return true;
}

function nativeEditOperation(
  webContents: NativeEditWebContents,
  commandId: EditCommandId
): void {
  switch (commandId) {
    case editorCommandIds.cutSelection:
      webContents.cut();
      return;
    case editorCommandIds.copySelection:
      webContents.copy();
      return;
    case editorCommandIds.pasteSelection:
      webContents.paste();
      return;
    case editorCommandIds.selectAllSelection:
      webContents.selectAll();
      return;
  }
}

function logNativeEditFailed(
  debugLogger: Pick<DebugLogger, "log"> | undefined,
  request: NativeEditDelegationRequest,
  reason: "web_contents_destroyed" | "native_delegation_unavailable"
): void {
  debugLogger?.log({
    level: "error",
    event: "edit.command.failed",
    details: {
      interactionId: request.interactionId,
      commandId: request.commandId,
      requestedSurface: request.requestedSurface,
      delegatedSurface: request.delegatedSurface,
      result: "failed",
      reason,
      ...(request.editorIdKind ? { editorIdKind: request.editorIdKind } : {}),
      ...(request.hasSelection !== undefined
        ? { hasSelection: request.hasSelection }
        : {})
    }
  });
}

function logMalformedNativeEditRequest(
  debugLogger: Pick<DebugLogger, "log"> | undefined,
  rawRequest: unknown
): void {
  debugLogger?.log({
    level: "error",
    event: "edit.command.failed",
    details: {
      ...partialInteractionIdDetails(rawRequest),
      result: "failed",
      reason: "invalid_command"
    }
  });
}

export function delegateNativeEditCommand(input: {
  request: NativeEditDelegationRequest;
  webContents: NativeEditWebContents;
  debugLogger?: Pick<DebugLogger, "log">;
}): boolean {
  const { request, webContents, debugLogger } = input;

  if (webContents.isDestroyed()) {
    logNativeEditFailed(debugLogger, request, "web_contents_destroyed");
    return false;
  }

  try {
    nativeEditOperation(webContents, request.commandId);
  } catch {
    logNativeEditFailed(
      debugLogger,
      request,
      "native_delegation_unavailable"
    );
    return false;
  }

  debugLogger?.log({
    level: "debug",
    event: "edit.command.delegated",
    details: {
      interactionId: request.interactionId,
      commandId: request.commandId,
      requestedSurface: request.requestedSurface,
      delegatedSurface: request.delegatedSurface,
      ...(request.editorIdKind ? { editorIdKind: request.editorIdKind } : {}),
      ...(request.hasSelection !== undefined
        ? { hasSelection: request.hasSelection }
        : {})
    }
  });

  return true;
}

async function handlePopupEditMenu(
  event: IpcMainInvokeEvent,
  rawRequest: unknown,
  debugLogger?: Pick<DebugLogger, "log">
): Promise<boolean> {
  const request = popupRequestFromRaw(rawRequest);

  if (!request) {
    logContextMenuSuppressed(debugLogger, {
      ...partialInteractionIdDetails(rawRequest),
      reason: "invalid_command"
    });
    return false;
  }

  const settings = await loadSettings();

  return popupEditContextMenu({
    request,
    language: settings.workbench.language,
    webContents: event.sender,
    window: BrowserWindow.fromWebContents(event.sender),
    debugLogger
  });
}

function handleNativeEditDelegation(
  event: IpcMainInvokeEvent,
  rawRequest: unknown,
  debugLogger?: Pick<DebugLogger, "log">
): boolean {
  const request = nativeEditRequestFromRaw(rawRequest);

  if (!request) {
    logMalformedNativeEditRequest(debugLogger, rawRequest);
    return false;
  }

  return delegateNativeEditCommand({
    request,
    webContents: event.sender,
    debugLogger
  });
}

export function registerContextMenuIpc(
  debugLogger?: Pick<DebugLogger, "log">
): void {
  ipcMain.handle(CONTEXT_MENU_CHANNELS.popupEditMenu, (event, rawRequest) =>
    handlePopupEditMenu(event, rawRequest, debugLogger)
  );
  ipcMain.handle(EDIT_CHANNELS.delegateNativeEdit, (event, rawRequest) =>
    handleNativeEditDelegation(event, rawRequest, debugLogger)
  );
}
