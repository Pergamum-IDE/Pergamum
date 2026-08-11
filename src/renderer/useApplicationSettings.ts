import { useEffect, useState } from "react";
import type {
  ApplicationSettings,
  SaveApplicationSettingsRequest
} from "../shared/api";

export const defaultApplicationSettings: ApplicationSettings = {
  showStatusBar: true,
  recentProjects: []
};

interface UseApplicationSettingsResult {
  settings: ApplicationSettings;
  isLoading: boolean;
  error: string | null;
  reloadSettings: () => Promise<void>;
  saveSettings: (settings: SaveApplicationSettingsRequest) => Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function useApplicationSettings(): UseApplicationSettingsResult {
  const [settings, setSettings] = useState<ApplicationSettings>(
    defaultApplicationSettings
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadSettings(): Promise<void> {
    try {
      const loadedSettings = await window.pergamum.settings.getSettings();

      setSettings(loadedSettings);
      setError(null);
    } catch (reloadError) {
      setError(errorMessage(reloadError));
      throw reloadError;
    }
  }

  useEffect(() => {
    let isMounted = true;

    window.pergamum.settings
      .getSettings()
      .then((loadedSettings) => {
        if (!isMounted) {
          return;
        }

        setSettings(loadedSettings);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(errorMessage(loadError));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSettings(
    nextSettings: SaveApplicationSettingsRequest
  ): Promise<void> {
    const savedSettings = await window.pergamum.settings.saveSettings(
      nextSettings
    );

    setSettings(savedSettings);
    setError(null);
  }

  return {
    settings,
    isLoading,
    error,
    reloadSettings,
    saveSettings
  };
}
