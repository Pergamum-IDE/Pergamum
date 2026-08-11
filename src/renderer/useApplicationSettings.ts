import { useEffect, useState } from "react";
import type { ApplicationSettings } from "../shared/api";

export const defaultApplicationSettings: ApplicationSettings = {
  showStatusBar: true
};

interface UseApplicationSettingsResult {
  settings: ApplicationSettings;
  isLoading: boolean;
  error: string | null;
  saveSettings: (settings: ApplicationSettings) => Promise<void>;
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
    nextSettings: ApplicationSettings
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
    saveSettings
  };
}
