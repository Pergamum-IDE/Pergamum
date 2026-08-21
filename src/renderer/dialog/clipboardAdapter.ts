/**
 * Clipboard writes must go through a testable adapter (#182 D-9) — the
 * dialog component must never call clipboard APIs directly. The default
 * implementation below uses `navigator.clipboard`; a different safe path
 * (e.g. an Electron/preload-backed implementation) can be substituted by
 * injecting a different `ClipboardAdapter` into `DialogProvider`.
 */
export interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
}

export const navigatorClipboardAdapter: ClipboardAdapter = {
  writeText(text: string): Promise<void> {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      return Promise.reject(
        new Error("Clipboard API is not available in this environment.")
      );
    }

    return navigator.clipboard.writeText(text);
  }
};

export type ClipboardCopyResult = { ok: true } | { ok: false };

/**
 * The pure, DOM-free half of the copy button's behavior: calls the adapter
 * with exactly `text` and reports success/failure as a plain result rather
 * than throwing, so callers (and tests) don't need a try/catch and a
 * clipboard failure is never silently swallowed — the caller always
 * receives `{ ok: false }` and is responsible for surfacing it.
 */
export async function performClipboardCopy(
  adapter: ClipboardAdapter,
  text: string
): Promise<ClipboardCopyResult> {
  try {
    await adapter.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
