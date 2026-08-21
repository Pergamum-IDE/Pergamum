import { describe, expect, it } from "vitest";
import {
  builtInDefaultSettings,
  createDefaultApplicationSettings,
  defaultApplicationSettings,
  defaultPreviewRenderer,
  isPreviewRendererId,
  resolveEffectiveSettings,
  type ApplicationSettings
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

describe("workbench.fontFamily wiring (#173)", () => {
  it("builtInDefaultSettings.workbench.fontFamily derives from the catalog default", () => {
    expect(builtInDefaultSettings.workbench.fontFamily).toBe(
      getCatalogDefaultValue("workbench.fontFamily")
    );
  });

  it("defaultApplicationSettings / createDefaultApplicationSettings leave workbench.fontFamily unset (sparse baseline, #173 D-7)", () => {
    expect(defaultApplicationSettings.workbench).toEqual({});
    expect(createDefaultApplicationSettings().workbench).toEqual({});
  });

  it("resolveEffectiveSettings falls through to the catalog default when applicationSettings.workbench.fontFamily is absent", () => {
    expect(
      resolveEffectiveSettings(defaultApplicationSettings, undefined).workbench
        .fontFamily
    ).toBe(getCatalogDefaultValue("workbench.fontFamily"));
  });

  it("resolveEffectiveSettings passes through a valid non-default applicationSettings.workbench.fontFamily override", () => {
    const applicationSettings: ApplicationSettings = {
      ...defaultApplicationSettings,
      workbench: { fontFamily: "Fira Code" }
    };

    expect(
      resolveEffectiveSettings(applicationSettings, undefined).workbench
        .fontFamily
    ).toBe("Fira Code");
    expect(applicationSettings.workbench.fontFamily).not.toBe(
      getCatalogDefaultValue("workbench.fontFamily")
    );
  });

  it("workbench.fontFamily has no project-scope fallthrough — projectSettings does not carry a workbench key at all", () => {
    const applicationSettings: ApplicationSettings = {
      ...defaultApplicationSettings,
      workbench: { fontFamily: "Fira Code" }
    };

    // ProjectSettings is typed without a `workbench` field (#173 does not
    // enable a project override), so the effective value can only ever come
    // from application scope or the catalog default here.
    expect(
      resolveEffectiveSettings(applicationSettings, {}).workbench.fontFamily
    ).toBe("Fira Code");
  });
});
