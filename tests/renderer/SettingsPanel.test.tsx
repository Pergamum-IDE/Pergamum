import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultApplicationSettings } from "../../src/shared/settings";
import { t, type Language, type Translate } from "../../src/shared/i18n";
import { SettingsPanel } from "../../src/renderer/SettingsPanel";

function translateFor(language: Language): Translate {
  return (key, values) => t(language, key, values);
}

function renderSettingsPanel(currentUiLanguage: Language): string {
  return renderToStaticMarkup(
    <SettingsPanel
      settings={defaultApplicationSettings}
      isLoading={false}
      error={null}
      translate={translateFor(currentUiLanguage)}
      onChangeSettings={() => undefined}
    />
  );
}

function extractLanguageOptions(markup: string): Array<[string, string]> {
  return Array.from(
    markup.matchAll(/<option\b[^>]*value="([^"]+)"[^>]*>([^<]*)<\/option>/g),
    (match) => [match[1] ?? "", match[2] ?? ""]
  );
}

describe("SettingsPanel language selector (#186)", () => {
  it("renders native language names when the current UI language is Japanese", () => {
    expect(extractLanguageOptions(renderSettingsPanel("ja"))).toEqual([
      ["ja", "日本語"],
      ["en", "English"]
    ]);
  });

  it("renders the same native language names when the current UI language is English", () => {
    expect(extractLanguageOptions(renderSettingsPanel("en"))).toEqual([
      ["ja", "日本語"],
      ["en", "English"]
    ]);
  });
});
