export interface SaveInFlightGuard {
  run<T>(
    operation: () => T | Promise<T>,
    onIgnored?: () => void
  ): Promise<T | undefined>;
  isInFlight(): boolean;
}

export function createSaveInFlightGuard(): SaveInFlightGuard {
  let inFlight = false;

  return {
    run: async (operation, onIgnored) => {
      if (inFlight) {
        onIgnored?.();
        return undefined;
      }

      inFlight = true;

      try {
        return await operation();
      } finally {
        inFlight = false;
      }
    },
    isInFlight: () => inFlight
  };
}
