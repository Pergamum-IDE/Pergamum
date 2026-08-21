import type {
  AppChoiceDialogResult,
  AppDialogChoiceId
} from "./appDialogTypes";

export function choiceDialogChosenResult(
  id: AppDialogChoiceId
): AppChoiceDialogResult {
  return { kind: "chosen", id };
}

export function choiceDialogDismissedResult(): AppChoiceDialogResult {
  return { kind: "dismissed" };
}

export function handleChoiceDialogBackdropClick(
  onResult: (result: AppChoiceDialogResult) => void,
  dismissOnBackdropClick: boolean
): void {
  if (!dismissOnBackdropClick) {
    return;
  }

  onResult(choiceDialogDismissedResult());
}

export function handleChoiceDialogKeyDown(
  event: { key: string },
  onResult: (result: AppChoiceDialogResult) => void
): boolean {
  if (event.key === "Escape") {
    onResult(choiceDialogDismissedResult());
    return true;
  }

  return false;
}
