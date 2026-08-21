import {
  AppDialogError,
  validateChoiceDialogOptions,
  type AppChoiceDialogOptions,
  type AppChoiceDialogResult,
  type AppConfirmDialogOptions,
  type AppConfirmDialogResult
} from "./appDialogTypes";

export type DialogControllerPendingRequest =
  | {
      readonly kind: "confirm";
      readonly options: AppConfirmDialogOptions;
    }
  | {
      readonly kind: "choice";
      readonly options: AppChoiceDialogOptions;
    };

type DialogControllerPendingState =
  | {
      readonly kind: "confirm";
      readonly options: AppConfirmDialogOptions;
      readonly resolve: (result: AppConfirmDialogResult) => void;
    }
  | {
      readonly kind: "choice";
      readonly options: AppChoiceDialogOptions;
      readonly resolve: (result: AppChoiceDialogResult) => void;
    };

/**
 * The DOM-free half of the dialog host (#182). All the state-machine rules
 * that don't need a browser — concurrent-request rejection (D-14) and
 * host-unmount lifecycle (D-16) — live here so they can be unit tested
 * without a DOM. `DialogProvider` wraps this in React state and is
 * responsible only for rendering the matching dialog when a request is
 * pending.
 *
 * `pending` is a synchronous field, not React state: dialog requests must be
 * able to detect a concurrent request the instant it's called, even if two
 * calls happen in the same tick before any render/effect runs.
 */
export class DialogController {
  private pending: DialogControllerPendingState | null = null;
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
    if (!this.pending) {
      return null;
    }

    if (this.pending.kind === "confirm") {
      return { kind: "confirm", options: this.pending.options };
    }

    return { kind: "choice", options: this.pending.options };
  }

  confirm(
    options: AppConfirmDialogOptions
  ): Promise<AppConfirmDialogResult> {
    if (this.pending) {
      return Promise.reject(new AppDialogError("dialogAlreadyOpen"));
    }

    return new Promise<AppConfirmDialogResult>((resolve) => {
      this.pending = { kind: "confirm", options, resolve };
      this.onChange?.();
    });
  }

  choice(options: AppChoiceDialogOptions): Promise<AppChoiceDialogResult> {
    if (this.pending) {
      return Promise.reject(new AppDialogError("dialogAlreadyOpen"));
    }

    try {
      validateChoiceDialogOptions(options);
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<AppChoiceDialogResult>((resolve) => {
      this.pending = { kind: "choice", options, resolve };
      this.onChange?.();
    });
  }

  /**
   * Resolves the currently pending request, if any. A stale/duplicate call
   * (no pending request, or the dialog already closed) is a no-op — it must
   * not resolve a future, unrelated request.
   */
  resolve(result: AppConfirmDialogResult | AppChoiceDialogResult): void {
    const current = this.pending;

    if (!current) {
      return;
    }

    if (current.kind === "confirm" && typeof result === "string") {
      this.pending = null;
      current.resolve(result);
    } else if (current.kind === "choice" && typeof result !== "string") {
      this.pending = null;
      current.resolve(result);
    } else {
      throw new AppDialogError("invalidDialogResult");
    }

    this.onChange?.();
  }

  /**
   * Host unmount: a pending confirm resolves `"cancel"` (D-16), while a
   * pending choice resolves `{ kind: "dismissed" }` because no explicit
   * choice was made (#192).
   */
  dispose(): void {
    const current = this.pending;

    if (!current) {
      return;
    }

    if (current.kind === "confirm") {
      this.resolve("cancel");
    } else {
      this.resolve({ kind: "dismissed" });
    }
  }
}
