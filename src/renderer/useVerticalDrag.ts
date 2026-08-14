import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseVerticalDragOptions {
  onDragStart?: () => void;
  onDragMove: (deltaY: number) => void;
  onDragEnd?: () => void;
}

export interface VerticalDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * PointerEvent-based vertical drag primitive for the Utility Window height
 * resize handle. Reports the cumulative Y offset from the pointerdown
 * position on every move, and suppresses text selection / shows a
 * row-resize cursor for the duration of the drag.
 */
export function useVerticalDrag({
  onDragStart,
  onDragMove,
  onDragEnd
}: UseVerticalDragOptions): VerticalDragHandlers {
  const startYRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  // Releases pointer capture / body cursor & selection overrides. Called
  // both from the normal pointerup/pointercancel path and from the
  // unmount cleanup below, so a drag that gets interrupted by the Utility
  // Window closing, a Project switch, or the handle unmounting never
  // leaves the body cursor or text-selection suppression stuck.
  const clearDragEffects = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const target = activeTargetRef.current;

    activePointerIdRef.current = null;
    activeTargetRef.current = null;

    if (
      target &&
      pointerId !== null &&
      target.hasPointerCapture(pointerId)
    ) {
      target.releasePointerCapture(pointerId);
    }

    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      clearDragEffects();
      onDragEnd?.();
    },
    [clearDragEffects, onDragEnd]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      startYRef.current = event.clientY;
      activePointerIdRef.current = event.pointerId;
      activeTargetRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = "row-resize";
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

      onDragMove(event.clientY - startYRef.current);
    },
    [onDragMove]
  );

  useEffect(() => {
    return () => {
      if (activePointerIdRef.current !== null) {
        clearDragEffects();
      }
    };
  }, [clearDragEffects]);

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
