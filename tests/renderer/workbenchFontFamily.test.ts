import { describe, expect, it, vi } from "vitest";
import {
  applyWorkbenchFontFamily,
  resolveSafeWorkbenchFontFamily,
  workbenchFontFamilyCustomProperty
} from "../../src/renderer/workbenchFontFamily";
import { getCatalogDefaultValue } from "../../src/shared/settingsCatalog";

const catalogDefault = getCatalogDefaultValue("workbench.fontFamily");
const controlCharacterFontFamily = "Fira" + String.fromCharCode(0) + "Code";

function fakeStyleTarget(): CSSStyleDeclaration {
  return { setProperty: vi.fn() } as unknown as CSSStyleDeclaration;
}

describe("resolveSafeWorkbenchFontFamily (#173 renderer-side defensive sanitization)", () => {
  it("passes through a valid non-default value", () => {
    expect(resolveSafeWorkbenchFontFamily("Fira Code")).toBe("Fira Code");
  });

  it("falls back to the catalog default for a control-character value", () => {
    expect(resolveSafeWorkbenchFontFamily(controlCharacterFontFamily)).toBe(
      catalogDefault
    );
  });

  it("falls back to the catalog default for an overlong (>128 char) value", () => {
    expect(resolveSafeWorkbenchFontFamily("A".repeat(129))).toBe(
      catalogDefault
    );
  });

  it("falls back to the catalog default for a value containing a quote/semicolon (CSS injection shape)", () => {
    expect(
      resolveSafeWorkbenchFontFamily('Fira Code"; } body { color: red')
    ).toBe(catalogDefault);
  });
});

describe("applyWorkbenchFontFamily (#173)", () => {
  it("sets --pergamum-workbench-font-family to a valid value on the given target", () => {
    const target = fakeStyleTarget();

    applyWorkbenchFontFamily("Fira Code", target);

    expect(target.setProperty).toHaveBeenCalledWith(
      workbenchFontFamilyCustomProperty,
      "Fira Code"
    );
  });

  it("sets --pergamum-workbench-font-family to the catalog default when passed an intentionally invalid value", () => {
    const target = fakeStyleTarget();

    applyWorkbenchFontFamily('Fira Code"; } body { color: red', target);

    expect(target.setProperty).toHaveBeenCalledWith(
      workbenchFontFamilyCustomProperty,
      catalogDefault
    );
  });
});
