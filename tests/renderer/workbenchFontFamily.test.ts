import { describe, expect, it, vi } from "vitest";
import {
  applyEditorFontFamily,
  applyWorkbenchFontFamily,
  editorFontFamilyCustomProperty,
  resolveSafeEditorFontFamily,
  resolveSafeWorkbenchFontFamily,
  workbenchFontFamilyCustomProperty
} from "../../src/renderer/workbenchFontFamily";
import { getCatalogDefaultValue } from "../../src/shared/settingsCatalog";

const workbenchCatalogDefault = getCatalogDefaultValue("workbench.fontFamily");
const editorCatalogDefault = getCatalogDefaultValue("editor.fontFamily");
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
      workbenchCatalogDefault
    );
  });

  it("falls back to the catalog default for an overlong (>128 char) value", () => {
    expect(resolveSafeWorkbenchFontFamily("A".repeat(129))).toBe(
      workbenchCatalogDefault
    );
  });

  it("falls back to the catalog default for a value containing a quote/semicolon (CSS injection shape)", () => {
    expect(
      resolveSafeWorkbenchFontFamily('Fira Code"; } body { color: red')
    ).toBe(workbenchCatalogDefault);
  });
});

describe("resolveSafeEditorFontFamily (#195 renderer-side defensive sanitization)", () => {
  it("passes through a valid non-default value", () => {
    expect(resolveSafeEditorFontFamily("Fira Code")).toBe("Fira Code");
  });

  it("falls back to the catalog default for an invalid value", () => {
    expect(resolveSafeEditorFontFamily(controlCharacterFontFamily)).toBe(
      editorCatalogDefault
    );
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
      workbenchCatalogDefault
    );
  });
});

describe("applyEditorFontFamily (#195)", () => {
  it("sets --pergamum-editor-font-family to a valid value on the given target", () => {
    const target = fakeStyleTarget();

    applyEditorFontFamily("Fira Code", target);

    expect(target.setProperty).toHaveBeenCalledWith(
      editorFontFamilyCustomProperty,
      "Fira Code"
    );
  });

  it("sets --pergamum-editor-font-family to the catalog default for invalid input", () => {
    const target = fakeStyleTarget();

    applyEditorFontFamily('Fira Code"; } body { color: red', target);

    expect(target.setProperty).toHaveBeenCalledWith(
      editorFontFamilyCustomProperty,
      editorCatalogDefault
    );
  });
});
