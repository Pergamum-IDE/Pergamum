import type { EditorId } from "../shared/editorId";

/**
 * Right-side trailing slot content for a document tab (#184). Close button
 * takes precedence over the dirty indicator whenever the tab is active or
 * hovered, so the two never render at the same time on the same tab.
 */
export type DocumentTabTrailingSlotKind = "close" | "dirty" | "empty";

export function documentTabTrailingSlotKind(
  isActive: boolean,
  isDirty: boolean,
  isHovered: boolean
): DocumentTabTrailingSlotKind {
  if (isActive || isHovered) {
    return "close";
  }

  return isDirty ? "dirty" : "empty";
}

/**
 * Close button clicks must not bubble to the tab's own click handler
 * (which would select the tab) — `stopPropagation` is what actually matters
 * here; `preventDefault` is included for consistency with the confirm
 * dialog's key handling (#182 precedent) and costs nothing since a button
 * click has no default action to suppress.
 */
export function handleDocumentTabCloseButtonClick(
  event: { preventDefault: () => void; stopPropagation: () => void },
  editorId: EditorId,
  onClose: (editorId: EditorId) => void
): void {
  event.preventDefault();
  event.stopPropagation();
  onClose(editorId);
}

/**
 * Middle-click / wheel-click (mouse button 1) closes the clicked tab.
 * Handled on `mousedown` rather than `click`: the DOM `click` event only
 * fires for the primary button, and `mousedown` lets us suppress the
 * browser's middle-click autoscroll cursor via `preventDefault` (#184).
 */
export function handleDocumentTabMiddleClick(
  event: {
    button: number;
    preventDefault: () => void;
    stopPropagation: () => void;
  },
  editorId: EditorId,
  onClose: (editorId: EditorId) => void
): boolean {
  if (event.button !== 1) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  onClose(editorId);
  return true;
}
