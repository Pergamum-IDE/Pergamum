import type { ApplicationSettings } from "../shared/api";

interface SettingsPanelProps {
  settings: ApplicationSettings;
  isLoading: boolean;
  error: string | null;
  onChangeSettings: (settings: ApplicationSettings) => void;
}

export function SettingsPanel({
  settings,
  isLoading,
  error,
  onChangeSettings
}: SettingsPanelProps): JSX.Element {
  return (
    <section className="settingsPanel" aria-label="Settings">
      <div className="settingsPanelHeader">Settings</div>
      <label className="settingsToggle">
        <input
          type="checkbox"
          checked={settings.showStatusBar}
          disabled={isLoading}
          onChange={(event) =>
            onChangeSettings({
              ...settings,
              showStatusBar: event.target.checked
            })
          }
        />
        <span>Show status bar</span>
      </label>
      {error ? <div className="settingsError">{error}</div> : null}
    </section>
  );
}
