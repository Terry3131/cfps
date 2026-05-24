import axios from "axios";

import { clearToken, getToken } from "../services/tokenService";

export const DEFAULT_LAN_API_BASE_URL = "http://192.168.43.13:5000";

let currentApiBaseUrl = DEFAULT_LAN_API_BASE_URL;
let unauthorizedHandler = null;

const api = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (currentApiBaseUrl && !config._apiBaseFallbackTried) {
    config.baseURL = currentApiBaseUrl;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearToken();
      if (typeof unauthorizedHandler === "function") {
        unauthorizedHandler();
      }
    }

    if (shouldRetryWithAlternateApiBase(error)) {
      const alternateBaseUrl = getAlternateApiBaseUrl(currentApiBaseUrl);
      const retryConfig = {
        ...error.config,
        baseURL: alternateBaseUrl,
        _apiBaseFallbackTried: true,
      };

      return api.request(retryConfig).then((response) => {
        currentApiBaseUrl = alternateBaseUrl;
        return response;
      });
    }

    return Promise.reject(error);
  }
);

export function configureApiClient({ baseUrl, onUnauthorized } = {}) {
  if (baseUrl) currentApiBaseUrl = baseUrl;
  if (onUnauthorized) unauthorizedHandler = onUnauthorized;
}

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

export function apiPath(path) {
  const normalized = String(path || "").trim();

  if (!normalized) {
    throw new Error("API path is required.");
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function unwrapResponse(response) {
  const payload = response?.data;

  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
}

export function extractCollection(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
}

export function getApiErrorMessage(error, fallback = "Request failed.") {
  if (error?.response?.status === 404) {
    return `${fallback} Backend route was not found for the selected API base URL.`;
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function shouldRetryWithAlternateApiBase(error) {
  return Boolean(
    error?.response?.status === 404 &&
      error?.config &&
      !error.config._apiBaseFallbackTried &&
      currentApiBaseUrl &&
      getAlternateApiBaseUrl(currentApiBaseUrl) !== currentApiBaseUrl
  );
}

function getAlternateApiBaseUrl(baseUrl) {
  const trimmed = String(baseUrl || "").replace(/\/+$/, "");

  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }

  return `${trimmed}/api`;
}

export default api;
