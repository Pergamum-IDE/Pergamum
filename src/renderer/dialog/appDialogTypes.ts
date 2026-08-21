import type { AppPlatform } from "../../shared/platform";

// ---------------------------------------------------------------------------
// Icon (#182 D-3 / D-4 / D-5 / D-6)
// ---------------------------------------------------------------------------

export type AppDialogIconKind = "info" | "warning" | "error" | "question";

/**
 * Nullable and explicit (D-4): `null` means the dialog intentionally has no
 * icon, distinct from "forgot to pass one". When present, `tooltip` is
 * required (D-5) and is also used as the icon's accessibility label.
 */
export type AppDialogIcon =
  | {
      kind: AppDialogIconKind;
      tooltip: string;
    }
  | null;

// ---------------------------------------------------------------------------
// Message (#182 D-7)
// ---------------------------------------------------------------------------

/**
 * `kind` is kept even though there is only one variant today: it preserves
 * the discriminated-union shape so a future `markdown` variant can be added
 * without changing call-site structure, and it stops callers from passing a
 * raw string as `message`.
 */
export type AppDialogMessage = {
  kind: "plainText";
  text: string;
};

// ---------------------------------------------------------------------------
// Tone (#182 D-12 / D-13)
// ---------------------------------------------------------------------------

export type AppConfirmDialogTone = "default" | "destructive";

// ---------------------------------------------------------------------------
// Result (#182 D-2)
// ---------------------------------------------------------------------------

export type AppConfirmDialogResult = "confirm" | "cancel";

// ---------------------------------------------------------------------------
// Errors (#182 D-14)
// ---------------------------------------------------------------------------

export type AppDialogErrorKind = "dialogAlreadyOpen";

/**
 * A concurrent confirm request is a programming/control-flow error, not a
 * user decision — it must reject with this typed error rather than resolve
 * `"cancel"` (D-14), so the two cases stay distinguishable at call sites.
 */
export class AppDialogError extends Error {
  readonly kind: AppDialogErrorKind;

  constructor(kind: AppDialogErrorKind) {
    super(`Application dialog error: ${kind}`);
    this.name = "AppDialogError";
    this.kind = kind;
  }
}

// ---------------------------------------------------------------------------
// Platform-specific action order (#182 D-11)
// ---------------------------------------------------------------------------

export type AppDialogActionOrder = "confirmCancel" | "cancelConfirm";

/**
 * Windows/Linux users expect the affirmative action on the left; macOS-style
 * convention places it on the right. `macos` is resolved the same as
 * `other` today but is kept as its own `AppPlatform` value (not collapsed
 * into `other`) so future macOS-specific handling doesn't require widening
 * this closed set again.
 */
export function getDialogActionOrder(
  platform: AppPlatform
): AppDialogActionOrder {
  if (platform === "windows" || platform === "linux") {
    return "confirmCancel";
  }

  return "cancelConfirm";
}

// ---------------------------------------------------------------------------
// Confirm dialog options (#182 D-10)
// ---------------------------------------------------------------------------

type AppConfirmDialogBaseOptions = {
  title: string;
  message: AppDialogMessage;
  icon: AppDialogIcon;
  clipboardText: string | null;
  cancelLabel?: string;
};

/**
 * A discriminated union so TypeScript enforces D-10's rule at the type
 * level: `tone: "destructive"` requires a concrete `confirmLabel`, while
 * `tone` omitted or `"default"` leaves both labels optional (defaulted to
 * the localized `common.ok` / `common.cancel`).
 */
export type AppConfirmDialogOptions =
  | (AppConfirmDialogBaseOptions & {
      tone?: "default";
      confirmLabel?: string;
    })
  | (AppConfirmDialogBaseOptions & {
      tone: "destructive";
      confirmLabel: string;
    });

export function confirmDialogTone(
  options: AppConfirmDialogOptions
): AppConfirmDialogTone {
  return options.tone ?? "default";
}
