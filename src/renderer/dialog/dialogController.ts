import {
  AppDialogError,
  type AppConfirmDialogOptions,
  type AppConfirmDialogResult
} from "./appDialogTypes";

export interface DialogControllerPendingRequest {
  readonly options: AppConfirmDialogOptions;
}

/**
 * The DOM-free half of the dialog host (#182). All the state-machine rules
 * that don't need a browser — concurrent-request rejection (D-14) and
 * host-unmount lifecycle (D-16) — live here so they can be unit tested
 * without a DOM. `DialogProvider` wraps this in React state and is
 * responsible only for rendering `ConfirmDialog` when a request is pending.
 *
 * `pending` is a synchronous field, not React state: `confirm()` must be
 * able to detect a concurrent request the instant it's called, even if two
 * calls happen in the same tick before any render/effect runs.
 */
export class DialogController {
  private pending: {
    options: AppConfirmDialogOptions;
    resolve: (result: AppConfirmDialogResult) => void;
  } | null = null;
  private onChange: (() => void) | null = null;

  /** `DialogProvider` calls this once to be notified when pending state changes. */
  subscribe(onChange: () => void): () => void {
    this.onChange = onChange;
    return () => {
      if (this.onChange === onChange) {
        this.onChange = null;
      }
    };
  }

  getPendingRequest(): DialogControllerPendingRequest | null {
    return this.pending ? { options: this.pending.options } : null;
  }

  confirm(
    options: AppConfirmDialogOptions
  ): Promise<AppConfirmDialogResult> {
    if (this.pending) {
      return Promise.reject(new AppDialogError("dialogAlreadyOpen"));
    }

    return new Promise<AppConfirmDialogResult>((resolve) => {
      this.pending = { options, resolve };
      this.onChange?.();
    });
  }

  /**
   * Resolves the currently pending request, if any. A stale/duplicate call
   * (no pending request, or the dialog already closed) is a no-op — it must
   * not resolve a future, unrelated request.
   */
  resolve(result: AppConfirmDialogResult): void {
    const current = this.pending;

    if (!current) {
      return;
    }

    this.pending = null;
    current.resolve(result);
    this.onChange?.();
  }

  /**
   * Host unmount (D-16): a pending confirm resolves `"cancel"` rather than
   * being left dangling forever.
   */
  dispose(): void {
    this.resolve("cancel");
  }
}
