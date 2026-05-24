import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { configureApiClient } from "../api/client";
import {
  DEFAULT_API_BASE_URL,
  getStoredApiBaseUrl,
  getStoredThemeMode,
  normalizeApiBaseUrl,
  setStoredApiBaseUrl,
  setStoredThemeMode,
} from "../services/settingsService";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);
  const [themeMode, setThemeModeState] = useState("system");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSettings() {
      const [storedUrl, storedTheme] = await Promise.all([
        getStoredApiBaseUrl(),
        getStoredThemeMode(),
      ]);

      if (!mounted) return;

      setApiBaseUrlState(storedUrl);
      setThemeModeState(storedTheme);
      configureApiClient({ baseUrl: storedUrl });
      setLoading(false);
    }

    restoreSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const setApiBaseUrl = async (value) => {
    const normalized = await setStoredApiBaseUrl(value);
    setApiBaseUrlState(normalized);
    configureApiClient({ baseUrl: normalized });
    return normalized;
  };

  const setThemeMode = async (value) => {
    const mode = await setStoredThemeMode(value);
    setThemeModeState(mode);
    return mode;
  };

  const value = useMemo(
    () => ({
      apiBaseUrl,
      loading,
      normalizeApiBaseUrl,
      setApiBaseUrl,
      setThemeMode,
      themeMode,
    }),
    [apiBaseUrl, loading, themeMode]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = useContext(SettingsContext);

  if (!value) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return value;
}
