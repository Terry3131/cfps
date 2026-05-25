import axios from "axios";
import { clearAuth, getToken } from "../auth/authStore";

export const API_BASE_URL = resolveApiBaseUrl();

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

if (import.meta.env.DEV) {
  console.info("API base URL", API_BASE_URL || "(not configured)");
}

API.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    return Promise.reject(
      new Error(
        "VITE_API_BASE_URL is missing or points to the frontend. Set it to the Render backend URL."
      )
    );
  }

  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      clearAuth();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;

export function getApiRequestUrl(path) {
  if (!API_BASE_URL) return path;

  try {
    return new URL(path, `${API_BASE_URL}/`).toString();
  } catch {
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }
}

function resolveApiBaseUrl() {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

  if (configuredUrl) {
    if (isFrontendUrl(configuredUrl)) {
      return "";
    }

    return configuredUrl;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:5000";
  }

  return "";
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function isFrontendUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const isCurrentAppOrigin =
      typeof window !== "undefined" && parsedUrl.origin === window.location.origin;

    return isCurrentAppOrigin || parsedUrl.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
