import type {
  ApplicationSettings,
  SaveApplicationSettingsRequest
} from "../shared/api";
import {
  supportedLanguages,
  type Language,
  type Translate
} from "../shared/i18n";

function languageLabelKey(language: Language): "language.ja" | "language.en" {
  return language === "ja" ? "language.ja" : "language.en";
}

interface SettingsPanelProps {
  settings: ApplicationSettings;
  isLoading: boolean;
  error: string | null;
  translate: Translate;
  onChangeSettings: (settings: SaveApplicationSettingsRequest) => void;
}

export function SettingsPanel({
  settings,
  isLoading,
  error,
  translate,
  onChangeSettings
}: SettingsPanelProps): JSX.Element {
  return (
    <section className="settingsPanel" aria-label={translate("settings.title")}>
      <div className="settingsPanelHeader">{translate("settings.title")}</div>
      <label className="settingsToggle">
        <input
          type="checkbox"
          checked={settings.workbench.statusBar.visible}
          disabled={isLoading}
          onChange={(event) =>
            onChangeSettings({
              workbench: {
                ...settings.workbench,
                statusBar: { visible: event.target.checked }
              }
            })
          }
        />
        <span>{translate("settings.showStatusBar")}</span>
      </label>
      <label className="settingsField">
        <span>{translate("settings.language")}</span>
        <select
          className="settingsSelect"
          value={settings.workbench.language}
          disabled={isLoading}
          onChange={(event) =>
            onChangeSettings({
              workbench: {
                ...settings.workbench,
                language: event.target.value as Language
              }
            })
          }
        >
          {supportedLanguages.map((language) => (
            <option key={language} value={language}>
              {translate(languageLabelKey(language))}
            </option>
          ))}
        </select>
      </label>
      <div className="settingsHelp">
        {translate("settings.languageRestartRequired")}
      </div>
      {error ? <div className="settingsError">{error}</div> : null}
    </section>
  );
}
