import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workbench.statusBar.visible / workbench.language runtime wiring (#174)", () => {
  it("App.tsx reads status bar visibility from effectiveSettings.workbench.statusBar.visible", () => {
    const appSource = readFileSync("src/renderer/App.tsx", "utf8");

    expect(appSource).toContain(
      "effectiveSettings.workbench.statusBar.visible"
    );
    expect(appSource).not.toContain("effectiveSettings.showStatusBar");
    expect(appSource).not.toContain("showStatusBar");
  });

  it("useApplicationSettings.ts sources displayLanguage from loadedSettings.workbench.language, not a legacy top-level field", () => {
    const hookSource = readFileSync(
      "src/renderer/useApplicationSettings.ts",
      "utf8"
    );

    expect(hookSource).toContain(
      "setDisplayLanguage(loadedSettings.workbench.language)"
    );
  });

  it("displayLanguage (the actual language-behavior source #9 refers to) is loaded once at startup, not recomputed from resolveEffectiveSettings — this is intentional (#174 mismatch note): resolveEffectiveSettings has no memoization boundary independent of live ApplicationSettings, so wiring translate() through effectiveSettings.workbench.language would make language changes apply immediately on save instead of after restart, which is exactly the runtime language switching #174 must not add. The 'settings.languageRestartRequired' UI copy documents this pre-existing (pre-#174) timing contract.", () => {
    const settingsPanelSource = readFileSync(
      "src/renderer/SettingsPanel.tsx",
      "utf8"
    );

    expect(settingsPanelSource).toContain("settings.languageRestartRequired");
  });

  it("SettingsPanel renders language options from the i18n-owned supportedLanguages list (#186)", () => {
    const settingsPanelSource = readFileSync(
      "src/renderer/SettingsPanel.tsx",
      "utf8"
    );

    expect(settingsPanelSource).toContain("supportedLanguages.map");
    expect(settingsPanelSource).toContain(
      "languageDefinitions[language].nativeName"
    );
    expect(settingsPanelSource).not.toContain('["ja", "en"]');
    expect(settingsPanelSource).not.toContain("languageLabelKey");
  });
});
