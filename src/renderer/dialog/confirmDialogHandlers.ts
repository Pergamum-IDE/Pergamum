import type { AppConfirmDialogResult } from "./appDialogTypes";

/**
 * Backdrop click behavior is explicit (#182 D-17): it resolves `"cancel"`.
 * Extracted as a standalone function so it can be unit tested without
 * dispatching a real DOM click event.
 */
export function handleConfirmDialogBackdropClick(
  onResult: (result: AppConfirmDialogResult) => void
): void {
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
