import { describe, expect, it } from "vitest";
import {
  builtInDefaultSettings,
  createDefaultApplicationSettings,
  defaultApplicationSettings,
  defaultPreviewRenderer,
  isPreviewRendererId,
  resolveEffectiveSettings
} from "../../src/shared/settings";
import { getCatalogDefaultValue } from "../../src/shared/settingsCatalog";

describe("existing implementation alignment: preview.renderer (#150)", () => {
  it("defaultPreviewRenderer equals the catalog default, not a separately hardcoded literal", () => {
    expect(defaultPreviewRenderer).toBe(
      getCatalogDefaultValue("preview.renderer")
    );
  });

  it("isPreviewRendererId agrees with the catalog's own validation for both valid and invalid values", () => {
    expect(isPreviewRendererId("markdown")).toBe(true);
    expect(isPreviewRendererId("html")).toBe(false);
    expect(isPreviewRendererId(1)).toBe(false);
    expect(isPreviewRendererId(undefined)).toBe(false);
  });

  it("builtInDefaultSettings / defaultApplicationSettings / createDefaultApplicationSettings all derive from the same catalog-backed default", () => {
    const catalogDefault = getCatalogDefaultValue("preview.renderer");

    expect(builtInDefaultSettings.preview.renderer).toBe(catalogDefault);
    expect(defaultApplicationSettings.preview.renderer).toBe(catalogDefault);
    expect(createDefaultApplicationSettings().preview.renderer).toBe(
      catalogDefault
    );
  });

  it("resolveEffectiveSettings's preview.renderer falls back through application settings and ultimately the catalog default — its merge order (Project > Application > Default) is unchanged by #150", () => {
    expect(
      resolveEffectiveSettings(defaultApplicationSettings, undefined).preview
        .renderer
    ).toBe("markdown");
    expect(
      resolveEffectiveSettings(defaultApplicationSettings, null).preview
        .renderer
    ).toBe("markdown");
    expect(
      resolveEffectiveSettings(defaultApplicationSettings, {}).preview
        .renderer
    ).toBe("markdown");
    expect(
      resolveEffectiveSettings(defaultApplicationSettings, {
        preview: { renderer: "markdown" }
      }).preview.renderer
    ).toBe("markdown");
  });
});
