import type { Translate } from "../shared/i18n";
import {
  AppDialogError,
  type AppChoiceDialogOptions,
  type AppChoiceDialogResult,
  type AppDialogChoiceId
} from "./dialog/appDialogTypes";
import {
  hasDirtyOpenDocuments,
  type OpenDocumentsState
} from "./openDocuments";

export const projectSwitchChoiceIds = {
  discardAndContinue: "discardAndContinue",
  cancel: "cancel"
} as const satisfies Record<string, AppDialogChoiceId>;

export type ProjectSwitchChoiceId =
  (typeof projectSwitchChoiceIds)[keyof typeof projectSwitchChoiceIds];

export function buildProjectSwitchUnsavedChoiceDialogOptions(
  translate: Translate
): AppChoiceDialogOptions {
  return {
    title: translate("dialog.projectSwitchUnsaved.title"),
    message: {
      kind: "plainText",
      text: translate("dialog.projectSwitchUnsaved.message")
    },
    icon: {
      kind: "warning",
      tooltip: translate("dialog.icon.warning")
    },
    choices: [
      {
        id: projectSwitchChoiceIds.discardAndContinue,
        label: translate(
          "dialog.projectSwitchUnsaved.discardAndContinue"
        ),
        role: "destructive",
        icon: { kind: "alertTriangle" }
      },
      {
        id: projectSwitchChoiceIds.cancel,
        label: translate("common.cancel"),
        role: "cancel"
      }
    ],
    primaryChoiceId: projectSwitchChoiceIds.discardAndContinue,
    cancelChoiceId: projectSwitchChoiceIds.cancel,
    initialFocusChoiceId: projectSwitchChoiceIds.cancel,
    clipboardText: null,
    dismissOnBackdropClick: false
  };
}

export interface ProjectSwitchConfirmationDeps {
  state: OpenDocumentsState;
  translate: Translate;
  choiceDialog: (
    options: AppChoiceDialogOptions
  ) => Promise<AppChoiceDialogResult>;
}

export async function confirmProjectSwitchWithUnsavedDocuments(
  deps: ProjectSwitchConfirmationDeps
): Promise<boolean> {
  if (!hasDirtyOpenDocuments(deps.state)) {
    return true;
  }

  let result: AppChoiceDialogResult;

  try {
    result = await deps.choiceDialog(
      buildProjectSwitchUnsavedChoiceDialogOptions(deps.translate)
    );
  } catch (error) {
    if (error instanceof AppDialogError && error.kind === "dialogAlreadyOpen") {
      return false;
    }

    throw error;
  }

  return (
    result.kind === "chosen" &&
    result.id === projectSwitchChoiceIds.discardAndContinue
  );
}
