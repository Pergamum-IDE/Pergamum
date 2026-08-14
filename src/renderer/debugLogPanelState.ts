import {
  DEBUG_LOG_GAP_RECOVERY_LIMIT,
  DEFAULT_DEBUG_LOG_UI_BUFFER_LIMIT,
  type DebugLogSnapshot,
  type SanitizedDebugLogEvent
} from "../shared/debugLog";

export interface DebugLogApi {
  getSnapshot(): Promise<DebugLogSnapshot>;
  onEvent(callback: (event: SanitizedDebugLogEvent) => void): () => void;
}

export interface DebugLogPanelState {
  snapshot: DebugLogSnapshot | null;
  events: SanitizedDebugLogEvent[];
  possibleGap: boolean;
}

export interface DebugLogBatchScheduler {
  request(callback: () => void): unknown;
  cancel(handle: unknown): void;
}

type DebugLogAnimationFrameHandle =
  | {
      kind: "animationFrame";
      id: number;
    }
  | {
      kind: "timeout";
      id: ReturnType<typeof setTimeout>;
    };

export interface DebugLogPanelSessionController {
  start(): void;
  dispose(): void;
}

interface DebugLogPanelSessionControllerOptions {
  api: DebugLogApi;
  onStateChange(state: DebugLogPanelState): void;
  scheduler?: DebugLogBatchScheduler;
  gapRecoveryLimit?: number;
}

export interface DebugLogSubscriptionGapState {
  lastSubscribedSeq: number | null;
  recoveryCount: number;
  possibleGap: boolean;
}

export interface DebugLogSubscriptionGapResult {
  state: DebugLogSubscriptionGapState;
  shouldRecover: boolean;
}

export function createInitialDebugLogSubscriptionGapState(): DebugLogSubscriptionGapState {
  return {
    lastSubscribedSeq: null,
    recoveryCount: 0,
    possibleGap: false
  };
}

export function resolveDebugLogSubscribedEventGap(
  state: DebugLogSubscriptionGapState,
  event: SanitizedDebugLogEvent,
  recoveryLimit = DEBUG_LOG_GAP_RECOVERY_LIMIT
): DebugLogSubscriptionGapResult {
  const hasGap =
    state.lastSubscribedSeq !== null &&
    event.seq !== state.lastSubscribedSeq + 1;
  const nextState: DebugLogSubscriptionGapState = {
    ...state,
    lastSubscribedSeq: event.seq
  };

  if (!hasGap) {
    return {
      state: nextState,
      shouldRecover: false
    };
  }

  if (state.recoveryCount < recoveryLimit) {
    return {
      state: {
        ...nextState,
        recoveryCount: state.recoveryCount + 1
      },
      shouldRecover: true
    };
  }

  return {
    state: {
      ...nextState,
      possibleGap: true
    },
    shouldRecover: false
  };
}

export function trimDebugLogEvents(
  events: readonly SanitizedDebugLogEvent[],
  limit: number
): SanitizedDebugLogEvent[] {
  const normalizedLimit = Math.max(1, limit);

  return events.length > normalizedLimit
    ? events.slice(events.length - normalizedLimit)
    : [...events];
}

export function appendDebugLogEventBatch(
  currentEvents: readonly SanitizedDebugLogEvent[],
  batch: readonly SanitizedDebugLogEvent[],
  limit: number
): SanitizedDebugLogEvent[] {
  if (batch.length === 0) {
    return [...currentEvents];
  }

  const seenSeq = new Set(currentEvents.map((event) => event.seq));
  const merged = [...currentEvents];

  for (const event of batch) {
    if (seenSeq.has(event.seq)) {
      continue;
    }

    seenSeq.add(event.seq);
    merged.push(event);
  }

  return trimDebugLogEvents(merged, limit);
}

export function mergeDebugLogSnapshotWithSubscribedEvents(
  snapshot: DebugLogSnapshot,
  subscribedEvents: readonly SanitizedDebugLogEvent[]
): SanitizedDebugLogEvent[] {
  const lastSnapshotSeq =
    snapshot.events.length > 0
      ? snapshot.events[snapshot.events.length - 1].seq
      : 0;
  const eventsAfterSnapshot = subscribedEvents.filter(
    (event) => event.seq > lastSnapshotSeq
  );

  return appendDebugLogEventBatch(
    snapshot.events,
    eventsAfterSnapshot,
    snapshot.uiBufferLimit
  );
}

export function formatDebugLogEventTime(
  timestamp: string,
  previousTimestamp: string | null,
  now: Date = new Date()
): string {
  const date = timestamp.slice(0, 10);
  const time = timestamp.slice(11, 23);

  if (date.length !== 10 || time.length !== 12) {
    return timestamp;
  }

  const previousDate = previousTimestamp?.slice(0, 10);
  const referenceDate = previousDate ?? formatLocalDate(now);

  return date === referenceDate ? time : `${date} ${time}`;
}

export function createAnimationFrameDebugLogBatchScheduler(): DebugLogBatchScheduler {
  return {
    request(callback) {
      if (typeof globalThis.requestAnimationFrame === "function") {
        return {
          kind: "animationFrame",
          id: globalThis.requestAnimationFrame(() => callback())
        } satisfies DebugLogAnimationFrameHandle;
      }

      return {
        kind: "timeout",
        id: globalThis.setTimeout(callback, 16)
      } satisfies DebugLogAnimationFrameHandle;
    },
    cancel(handle) {
      if (!isDebugLogAnimationFrameHandle(handle)) {
        return;
      }

      if (handle.kind === "animationFrame") {
        globalThis.cancelAnimationFrame(handle.id);
        return;
      }

      globalThis.clearTimeout(handle.id);
    }
  };
}

export function createDebugLogEventBatcher(options: {
  scheduler: DebugLogBatchScheduler;
  onBatch(batch: SanitizedDebugLogEvent[]): void;
}): {
  enqueue(event: SanitizedDebugLogEvent): void;
  dispose(): void;
} {
  const queue: SanitizedDebugLogEvent[] = [];
  let scheduledHandle: unknown = null;

  function flush(): void {
    scheduledHandle = null;
    const batch = queue.splice(0, queue.length);

    if (batch.length > 0) {
      options.onBatch(batch);
    }
  }

  return {
    enqueue(event) {
      queue.push(event);

      if (scheduledHandle === null) {
        scheduledHandle = options.scheduler.request(flush);
      }
    },
    dispose() {
      if (scheduledHandle !== null) {
        options.scheduler.cancel(scheduledHandle);
        scheduledHandle = null;
      }

      queue.splice(0, queue.length);
    }
  };
}

export function createDebugLogPanelSessionController(
  options: DebugLogPanelSessionControllerOptions
): DebugLogPanelSessionController {
  const scheduler =
    options.scheduler ?? createAnimationFrameDebugLogBatchScheduler();
  const gapRecoveryLimit =
    options.gapRecoveryLimit ?? DEBUG_LOG_GAP_RECOVERY_LIMIT;
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let snapshotApplied = false;
  let currentSnapshot: DebugLogSnapshot | null = null;
  let currentEvents: SanitizedDebugLogEvent[] = [];
  let possibleGap = false;
  let queuedBeforeSnapshot: SanitizedDebugLogEvent[] = [];
  let queuedDuringRecovery: SanitizedDebugLogEvent[] = [];
  let recoveryInFlight = false;
  let gapState = createInitialDebugLogSubscriptionGapState();

  function emitState(): void {
    if (!disposed) {
      options.onStateChange({
        snapshot: currentSnapshot,
        events: currentEvents,
        possibleGap
      });
    }
  }

  const batcher = createDebugLogEventBatcher({
    scheduler,
    onBatch(batch) {
      const limit =
        currentSnapshot?.uiBufferLimit ?? DEFAULT_DEBUG_LOG_UI_BUFFER_LIMIT;
      currentEvents = appendDebugLogEventBatch(currentEvents, batch, limit);
      emitState();
    }
  });

  function applySnapshot(
    snapshot: DebugLogSnapshot,
    subscribedEvents: readonly SanitizedDebugLogEvent[]
  ): void {
    currentSnapshot = snapshot;
    currentEvents = mergeDebugLogSnapshotWithSubscribedEvents(
      snapshot,
      subscribedEvents
    );
    emitState();
  }

  async function recoverFromGap(): Promise<void> {
    if (recoveryInFlight) {
      return;
    }

    recoveryInFlight = true;
    queuedDuringRecovery = [];

    try {
      const snapshot = await options.api.getSnapshot();

      if (disposed) {
        return;
      }

      applySnapshot(snapshot, queuedDuringRecovery);
    } catch {
      return;
    } finally {
      recoveryInFlight = false;
      queuedDuringRecovery = [];
    }
  }

  function handleSubscribedEvent(event: SanitizedDebugLogEvent): void {
    const gapResult = resolveDebugLogSubscribedEventGap(
      gapState,
      event,
      gapRecoveryLimit
    );
    gapState = gapResult.state;

    if (gapState.possibleGap) {
      possibleGap = true;
    }

    if (gapResult.shouldRecover) {
      void recoverFromGap();
    }

    if (!snapshotApplied) {
      queuedBeforeSnapshot.push(event);
      return;
    }

    if (recoveryInFlight) {
      queuedDuringRecovery.push(event);
    }

    batcher.enqueue(event);
  }

  return {
    start() {
      unsubscribe = options.api.onEvent(handleSubscribedEvent);

      void options.api
        .getSnapshot()
        .then((snapshot) => {
          if (disposed) {
            return;
          }

          snapshotApplied = true;
          const queued = queuedBeforeSnapshot;
          queuedBeforeSnapshot = [];
          applySnapshot(snapshot, queued);
        })
        .catch(() => undefined);
    },
    dispose() {
      disposed = true;
      batcher.dispose();
      unsubscribe?.();
      unsubscribe = null;
      queuedBeforeSnapshot = [];
      queuedDuringRecovery = [];
    }
  };
}

function isDebugLogAnimationFrameHandle(
  value: unknown
): value is DebugLogAnimationFrameHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value.kind === "animationFrame" || value.kind === "timeout") &&
    "id" in value
  );
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
