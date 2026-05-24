import * as SecureStore from "expo-secure-store";

import { DEFAULT_LAN_API_BASE_URL } from "../api/client";

export const DEFAULT_API_BASE_URL = DEFAULT_LAN_API_BASE_URL;

const API_BASE_URL_KEY = "cfps.apiBaseUrl";
const THEME_MODE_KEY = "cfps.themeMode";

export function normalizeApiBaseUrl(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\/+$/, "");

  if (!normalized || normalized.includes("YOUR-PC-IP")) {
    return DEFAULT_API_BASE_URL;
  }

  return normalized;
}

export async function getStoredApiBaseUrl() {
  const stored = await SecureStore.getItemAsync(API_BASE_URL_KEY);
  return normalizeApiBaseUrl(stored || DEFAULT_API_BASE_URL);
}

export async function setStoredApiBaseUrl(value) {
  const normalized = normalizeApiBaseUrl(value);
  await SecureStore.setItemAsync(API_BASE_URL_KEY, normalized);
  return normalized;
}

export async function getStoredThemeMode() {
  return (await SecureStore.getItemAsync(THEME_MODE_KEY)) || "system";
}

export async function setStoredThemeMode(value) {
  const mode = ["system", "light", "dark"].includes(value) ? value : "system";
  await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  return mode;
}
