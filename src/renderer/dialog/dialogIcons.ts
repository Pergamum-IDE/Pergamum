import infoIconRaw from "../../../assets/icons/dialog/info.svg?raw";
import warningIconRaw from "../../../assets/icons/dialog/alert-circle.svg?raw";
import errorIconRaw from "../../../assets/icons/dialog/x-circle.svg?raw";
import questionIconRaw from "../../../assets/icons/dialog/help-circle.svg?raw";
import clipboardIconRaw from "../../../assets/icons/dialog/clipboard.svg?raw";
import type { AppDialogIconKind } from "./appDialogTypes";

/**
 * Feather Icons (MIT, see assets/icons/LICENSE.txt), mapped per #182 D-6.
 * These are dialog-owned assets under `assets/icons/dialog/`, distinct from
 * the shared icons in `assets/icons/global/`.
 * `error` uses `x-circle.svg`, not `error-octagon.svg` — the latter is a
 * pre-existing `x-octagon` asset unrelated to this mapping.
 * `warning` uses the circular `alert-circle.svg`, not `alert-triangle.svg` —
 * dialog icons are circle-based per PO decision; `alert-triangle.svg` stays
 * under `assets/icons/global/` for non-dialog surfaces (e.g. the
 * external-document tab indicator in DocumentTabBar.tsx).
 */
export const dialogIconSvgByKind: Record<AppDialogIconKind, string> = {
  info: infoIconRaw,
  warning: warningIconRaw,
  error: errorIconRaw,
  question: questionIconRaw
};

export const dialogCopyButtonIconSvg = clipboardIconRaw;
