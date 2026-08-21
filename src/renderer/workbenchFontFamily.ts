import {
  getCatalogDefaultValue,
  validateCatalogValue
} from "../shared/settingsCatalog";

// UI chrome only (sidebar, status bar, command palette, tabs) — see
// styles.css selectors that read this via var(). Editor/preview body text
// deliberately do not consume it (#173 D-1).
export const workbenchFontFamilyCustomProperty =
  "--pergamum-workbench-font-family";

// The main process already validates workbench.fontFamily against the
// catalog before it reaches effective settings (#173 D-4), but the
// renderer must not trust that as given (ADR-0006 S-15): it re-runs the
// same shared catalog validation here rather than trusting the IPC payload
// or duplicating a validation regex.
export function resolveSafeWorkbenchFontFamily(fontFamily: string): string {
  return validateCatalogValue("workbench.fontFamily", fontFamily).ok
    ? fontFamily
    : getCatalogDefaultValue("workbench.fontFamily");
}

// `target` defaults to the live document root, but accepts an injected
// CSSStyleDeclaration so this stays testable without a DOM environment.
export function applyWorkbenchFontFamily(
  fontFamily: string,
  target: CSSStyleDeclaration = document.documentElement.style
): void {
  target.setProperty(
    workbenchFontFamilyCustomProperty,
    resolveSafeWorkbenchFontFamily(fontFamily)
  );
}
