import type { EditCommandId } from "../shared/commandIds";
import {
  CommandDisabledError,
  type CommandArgumentList,
  type CommandId,
  type CommandRegistry
} from "../shared/commandRegistry";
import type { DebugLogEditorIdKind, DebugLogLevel } from "../shared/debugLog";
import {
  editContextMenuItems,
  isEditableContextSurface,
  pergamumContextSurfaceAttribute,
  type ContextMenuSurface,
  type EditContextMenuCommandSelection,
  type EditContextMenuPopupRequest,
  type EditableContextSurface,
  type NativeEditDelegationRequest
} from "../shared/editContextMenu";

export interface ContextMenuEventLike {
  readonly target: unknown;
  preventDefault(): void;
}

export interface RendererEditContextMenuLogInput {
  readonly level: DebugLogLevel;
  readonly event:
    | "contextMenu.requested"
    | "contextMenu.suppressed"
    | "edit.command.requested"
    | "edit.command.ignored"
    | "edit.command.failed";
  readonly details: Record<string, unknown>;
}

export type RendererEditContextMenuLogger = (
  input: RendererEditContextMenuLogInput
) => void;

export interface NativeEditCommandContext
  extends NativeEditDelegationRequest {}

interface ElementLike {
  readonly parentElement: ElementLike | null;
  getAttribute(name: string): string | null;
}

function isElementLike(value: unknown): value is ElementLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "getAttribute" in value &&
    typeof (value as { getAttribute?: unknown }).getAttribute === "function"
  );
}

function elementFromTarget(target: unknown): ElementLike | null {
  if (isElementLike(target)) {
    return target;
  }

  if (
    typeof target === "object" &&
    target !== null &&
    "parentElement" in target &&
    isElementLike((target as { parentElement?: unknown }).parentElement)
  ) {
    return (target as { parentElement: ElementLike }).parentElement;
  }

  return null;
}

export function editableContextSurfaceFromTarget(
  target: unknown
): EditableContextSurface | null {
  let current = elementFromTarget(target);

  while (current) {
    const surface = current.getAttribute(pergamumContextSurfaceAttribute);

    if (surface !== null) {
      return isEditableContextSurface(surface) ? surface : null;
    }

    current = current.parentElement;
  }

  return null;
}

export function delegatedContextSurfaceFromTarget(
  target: unknown
): ContextMenuSurface {
  return editableContextSurfaceFromTarget(target) ?? "unknownEditable";
}

/**
 * Observes the focus target at element granularity (`document.activeElement`)
 * immediately before native edit delegation.
 *
 * This exists to detect the case where focus is not restored to the intended
 * editable element after the native context menu closes — custom MenuItem click
 * handlers fire after dismissal, so delegation can land somewhere else. When that
 * happens, this returns `unknownEditable` and diverges from `requestedSurface`.
 *
 * A window-granularity counterpart (`delegatedFocusPresent`, from
 * `webContents.isFocused()`) was implemented and removed. Moving window focus away
 * dismisses the native menu before any item can be clicked, so by the time
 * `edit.command.delegated` fires, window focus is always present and the field
 * could never be `false`. Measured 2026-08-16: 6 of 9 interactions ended without
 * `contextMenu.command.selected` while attempting to trigger it.
 *
 * Element granularity is required. Do not replace this with a window- or
 * frame-level focus check.
 *
 * ネイティブ編集委譲の直前に、要素粒度（`document.activeElement`）でフォーカス
 * 対象を観測する。
 *
 * 目的は、ネイティブコンテキストメニューが閉じた後にフォーカスが意図した編集要素
 * へ戻らないケースの検出。カスタム MenuItem の click handler はメニュー閉鎖後に
 * 発火するため、委譲先がずれうる。その場合ここは `unknownEditable` を返し、
 * `requestedSurface` と乖離する。
 *
 * ウィンドウ粒度の対応物（`webContents.isFocused()` による
 * `delegatedFocusPresent`）は実装後に削除した。ウィンドウフォーカスが外れると
 * 項目をクリックする前にネイティブメニューが閉じるため、
 * `edit.command.delegated` に到達した時点でウィンドウフォーカスは必ず存在し、
 * false になれない。2026-08-16 実測：発生を試みた9回のうち6回が
 * `contextMenu.command.selected` に到達せず終了した。
 *
 * 要素粒度であることが要件。ウィンドウ／フレーム粒度のフォーカス判定に
 * 置き換えないこと。
 */
export function delegatedContextSurfaceFromDocument(
  documentLike?: Pick<Document, "activeElement">
): ContextMenuSurface {
  const activeElement =
    documentLike?.activeElement ??
    (typeof document === "undefined" ? null : document.activeElement);

  return delegatedContextSurfaceFromTarget(activeElement);
}

function isTextSelectionControl(
  value: unknown
): value is { selectionStart: number | null; selectionEnd: number | null } {
  return (
    typeof value === "object" &&
    value !== null &&
    "selectionStart" in value &&
    "selectionEnd" in value
  );
}

export function hasSelectionInDocument(
  documentLike?: Pick<Document, "activeElement">,
  getSelection?: () => Selection | null
): boolean {
  const activeElement =
    documentLike?.activeElement ??
    (typeof document === "undefined" ? null : document.activeElement);

  if (isTextSelectionControl(activeElement)) {
    return (
      activeElement.selectionStart !== null &&
      activeElement.selectionEnd !== null &&
      activeElement.selectionStart !== activeElement.selectionEnd
    );
  }

  const selectionProvider =
    getSelection ??
    (typeof window === "undefined"
      ? undefined
      : () => window.getSelection());
  const selection = selectionProvider?.();

  return selection ? !selection.isCollapsed : false;
}

export function createContextMenuInteractionIdFactory(): () => string {
  let nextInteractionIndex = 0;

  return () => {
    nextInteractionIndex += 1;
    return `contextMenu.${nextInteractionIndex}`;
  };
}

export function editContextMenuPopupRequest(input: {
  commandRegistry: CommandRegistry;
  interactionId: string;
  requestedSurface: EditableContextSurface;
}): EditContextMenuPopupRequest {
  return {
    interactionId: input.interactionId,
    requestedSurface: input.requestedSurface,
    items: editContextMenuItems.map((item) => ({
      commandId: item.commandId,
      enabled: input.commandRegistry.isEnabled(item.commandId)
    }))
  };
}

// Right-clicking during IME composition force-commits the pending text as-is —
// unconverted kana, not the selected candidate.
//
// This is a Chromium constraint, not a deliberate choice here. Verified 2026-08-16
// on Windows by temporarily removing the `event.preventDefault()` call below: the
// behavior is unchanged, so composition ends before the contextmenu event reaches
// this handler. VSCode (also Electron) behaves identically; Hidemaru (native Win32)
// preserves the composition, so this is a limitation of the runtime rather than of
// the platform.
//
// Avoiding it would require intervening in Chromium's composition handling, which
// is out of proportion to the cost: the text is committed early, not corrupted, and
// right-clicking mid-conversion is not part of a normal writing flow.
//
// IME 変換中の右クリックは、未確定文字列を未変換のまま強制確定させる。
// 選択中の変換候補ではなく、ひらがなのまま確定される。
//
// これは Chromium の制約であり、ここでの意図的な選択ではない。2026-08-16 Windows 実測、
// 下記の `event.preventDefault()` を一時的に外して検証済み。挙動は変わらないため、
// contextmenu イベントがこのハンドラに届く前にコンポジションが終了している。
// 同じく Electron 製の VSCode も同挙動。ネイティブ Win32 の秀丸は変換中文字列を
// 保護するため、プラットフォームではなくランタイムの制約である。
//
// 回避には Chromium のコンポジション処理への介入が必要で、費用に見合わない。
// 文字列は破壊されず確定が早まるだけであり、変換中の右クリックは通常の執筆
// フローに含まれない。
export function handleEditContextMenuEvent(
  event: ContextMenuEventLike,
  input: {
    commandRegistry: CommandRegistry;
    nextInteractionId: () => string;
    editorIdKind: DebugLogEditorIdKind;
    hasSelection: () => boolean;
    log: RendererEditContextMenuLogger;
    popupEditMenu: (request: EditContextMenuPopupRequest) => Promise<boolean>;
  }
): boolean {
  event.preventDefault();

  const interactionId = input.nextInteractionId();
  const requestedSurface = editableContextSurfaceFromTarget(event.target);

  if (!requestedSurface) {
    input.log({
      level: "debug",
      event: "contextMenu.suppressed",
      details: {
        interactionId,
        requestedSurface: "unknownEditable",
        editorIdKind: input.editorIdKind,
        result: "ignored",
        reason: "unsupported_surface"
      }
    });
    return false;
  }

  const request = editContextMenuPopupRequest({
    commandRegistry: input.commandRegistry,
    interactionId,
    requestedSurface
  });

  input.log({
    level: "debug",
    event: "contextMenu.requested",
    details: {
      interactionId,
      requestedSurface,
      editorIdKind: input.editorIdKind,
      hasSelection: input.hasSelection()
    }
  });

  void input.popupEditMenu(request).catch(() => {
    input.log({
      level: "debug",
      event: "contextMenu.suppressed",
      details: {
        interactionId,
        requestedSurface,
        editorIdKind: input.editorIdKind,
        result: "ignored",
        reason: "window_unavailable"
      }
    });
  });
  return true;
}

export async function executeContextMenuEditCommand<TCommandId extends EditCommandId>(
  selection: EditContextMenuCommandSelection & { commandId: TCommandId },
  input: {
    commandRegistry: CommandRegistry;
    editorIdKind: DebugLogEditorIdKind;
    delegatedSurface: ContextMenuSurface;
    hasSelection: boolean;
    log: RendererEditContextMenuLogger;
    setNativeEditCommandContext: (
      context: NativeEditCommandContext | null
    ) => void;
    clearNativeEditCommandContext: (context: NativeEditCommandContext) => void;
  }
): Promise<boolean> {
  const context: NativeEditCommandContext = {
    interactionId: selection.interactionId,
    commandId: selection.commandId,
    requestedSurface: selection.requestedSurface,
    delegatedSurface: input.delegatedSurface,
    editorIdKind: input.editorIdKind,
    hasSelection: input.hasSelection
  };

  input.log({
    level: "debug",
    event: "edit.command.requested",
    details: { ...context }
  });

  if (!input.commandRegistry.isEnabled(selection.commandId)) {
    input.log({
      level: "debug",
      event: "edit.command.ignored",
      details: {
        ...context,
        result: "ignored",
        reason: "disabled_command"
      }
    });
    return false;
  }

  input.setNativeEditCommandContext(context);

  try {
    await input.commandRegistry.execute(
      selection.commandId as CommandId<readonly [], void>,
      { source: "contextMenu" },
      ...([] as CommandArgumentList<readonly []>)
    );
  } catch (error) {
    if (error instanceof CommandDisabledError) {
      input.log({
        level: "debug",
        event: "edit.command.ignored",
        details: {
          ...context,
          result: "ignored",
          reason: error.reason
        }
      });
      return false;
    }

    input.log({
      level: "error",
      event: "edit.command.failed",
      details: {
        ...context,
        result: "failed"
      }
    });
    throw error;
  } finally {
    input.clearNativeEditCommandContext(context);
  }

  return true;
}
