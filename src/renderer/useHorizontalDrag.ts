import { useCallback, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseHorizontalDragOptions {
  onDragStart?: () => void;
  onDragMove: (deltaX: number) => void;
  onDragEnd?: () => void;
}

export interface HorizontalDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * PointerEvent-based horizontal drag primitive shared by the Sidebar and
 * Markdown Editor/Preview resize handles. Reports the cumulative X offset
 * from the pointerdown position on every move, and suppresses text
 * selection / shows a col-resize cursor for the duration of the drag.
 */
export function useHorizontalDrag({
  onDragStart,
  onDragMove,
  onDragEnd
}: UseHorizontalDragOptions): HorizontalDragHandlers {
  const startXRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      activePointerIdRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      onDragEnd?.();
    },
    [onDragEnd]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      startXRef.current = event.clientX;
      activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      onDragStart?.();
    },
    [onDragStart]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      onDragMove(event.clientX - startXRef.current);
    },
    [onDragMove]
  );

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag
    }),
    [onPointerDown, onPointerMove, endDrag]
  );
}
