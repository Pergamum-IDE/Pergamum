import type { AppConfirmDialogResult } from "./appDialogTypes";

/**
 * Backdrop click behavior is explicit (#182 D-17): by default it resolves
 * `"cancel"`. `dismissOnBackdropClick: false` (#184 follow-up) disables
 * this entirely — the click does nothing, so an accidental backdrop click
 * can't dismiss a dialog where that would be confusing (e.g. the dirty-close
 * confirmation). `Escape` and the Cancel button are unaffected either way.
 * Extracted as a standalone function so it can be unit tested without
 * dispatching a real DOM click event.
 */
export function handleConfirmDialogBackdropClick(
  onResult: (result: AppConfirmDialogResult) => void,
  dismissOnBackdropClick: boolean
): void {
  if (!dismissOnBackdropClick) {
    return;
  }

  onResult("cancel");
}

/**
 * `Escape` resolves `"cancel"` (#182 D-15). Deliberately does not implement
 * a dialog-wide `Enter = confirm` handler — `Enter` is left to native
 * button activation for whichever button currently has focus. Takes a
 * minimal `{ key: string }` shape rather than a real `KeyboardEvent` so it
 * can be unit tested without a DOM. Returns `true` when the key was
 * explicitly handled, so the caller knows to suppress further propagation.
 */
export function handleConfirmDialogKeyDown(
  event: { key: string },
  onResult: (result: AppConfirmDialogResult) => void
): boolean {
  if (event.key === "Escape") {
    onResult("cancel");
    return true;
  }

  return false;
}
