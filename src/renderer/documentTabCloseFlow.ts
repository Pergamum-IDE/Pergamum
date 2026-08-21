import type { Translate } from "../shared/i18n";
import type { EditorId } from "../shared/editorId";
import {
  AppDialogError,
  type AppConfirmDialogOptions,
  type AppConfirmDialogResult
} from "./dialog/appDialogTypes";
import {
  isOpenDocumentDirty,
  resolveCloseTargetEditorId,
  type OpenDocumentsState
} from "./openDocuments";

/**
 * The #182 dirty-close confirmation dialog options (#184 D-10): a
 * two-choice destructive confirm, never `window.confirm()` or an Electron
 * native dialog. `icon.kind: "warning"` is passed as a kind, not an SVG file
 * name — `dialogIcons.ts` owns the actual icon mapping.
 *
 * `dismissOnBackdropClick: false` (#184 follow-up): this dialog asks
 * whether to discard unsaved manuscript changes, so an accidental backdrop
 * click must not dismiss it — only `Escape` or the Cancel button cancel.
 */
export function buildDirtyCloseConfirmDialogOptions(
  translate: Translate
): AppConfirmDialogOptions {
  return {
    title: translate("dialog.dirtyClose.title"),
    message: {
      kind: "plainText",
      text: translate("dialog.dirtyClose.message")
    },
    icon: {
      kind: "warning",
      tooltip: translate("dialog.icon.warning")
    },
    clipboardText: null,
    tone: "destructive",
    confirmLabel: translate("dialog.dirtyClose.discardAndClose"),
    cancelLabel: translate("common.cancel"),
    dismissOnBackdropClick: false
  };
}

export interface EditorCloseFlowDeps {
  state: OpenDocumentsState;
  translate: Translate;
  confirmDialog: (
    options: AppConfirmDialogOptions
  ) => Promise<AppConfirmDialogResult>;
  onClose: (editorId: EditorId) => void;
}

/**
 * Resolves the close target (#184: explicit `editorId`, or the active
 * editor when omitted) and, for a dirty target, awaits the dirty-close
 * confirmation before calling `onClose`. A concurrent close request that
 * lands while a confirmation is already open rejects with
 * `AppDialogError("dialogAlreadyOpen")` (#182 D-14) — absorbed here as a
 * silent no-op: no additional close, no rethrow, the existing confirmation
 * stays open.
 */
export async function runEditorCloseFlow(
  editorId: EditorId | undefined,
  deps: EditorCloseFlowDeps
): Promise<void> {
  const targetId = resolveCloseTargetEditorId(deps.state, editorId);

  if (!targetId) {
    return;
  }

  if (isOpenDocumentDirty(deps.state, targetId)) {
    let result: AppConfirmDialogResult;

    try {
      result = await deps.confirmDialog(
        buildDirtyCloseConfirmDialogOptions(deps.translate)
      );
    } catch (error) {
      if (error instanceof AppDialogError && error.kind === "dialogAlreadyOpen") {
        return;
      }

      throw error;
    }

    if (result !== "confirm") {
      return;
    }
  }

  deps.onClose(targetId);
}
