import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { configureApiClient, getApiErrorMessage } from "../api/client";
import { loginRequest, logoutRequest, meRequest } from "../services/authService";
import { clearToken, getToken, setToken } from "../services/tokenService";
import { initializePushNotifications, teardownPushNotifications } from "../services/pushNotificationService";
import { isAllowedRole, normalizeRole } from "../utils/roles";

const AuthContext = createContext(null);

function getUnsupportedRoleMessage(role) {
  return `Role ${role || "UNKNOWN"} is not enabled for the mobile notification companion.`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const clearSession = useCallback(async () => {
    await clearToken();
    setUser(null);
    setError("");
  }, []);

  useEffect(() => {
    configureApiClient({
      onUnauthorized: () => {
        setUser(null);
        setError("Session expired. Sign in again.");
      },
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        setLoading(true);
        const token = await getToken();

        if (!token) {
          if (mounted) setUser(null);
          return;
        }

        const currentUser = await meRequest();
        const role = normalizeRole(currentUser?.role);

        if (!isAllowedRole(role)) {
          await clearToken();
          if (mounted) {
            setUser(null);
            setError(getUnsupportedRoleMessage(role));
          }
          return;
        }

        if (mounted) {
          setUser({ ...currentUser, role });
        }
      } catch (err) {
        await clearToken();
        if (mounted) {
          setUser(null);
          setError(getApiErrorMessage(err, "Could not restore session."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setTokenReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      setError("");

      const data = await loginRequest(username, password);
      const role = normalizeRole(data?.user?.role);

      if (!data?.token) {
        throw new Error("Login response did not include a token.");
      }

      if (!isAllowedRole(role)) {
        await clearToken();
        throw new Error(getUnsupportedRoleMessage(role));
      }

      await setToken(data.token);
      setUser({ ...data.user, role });
      initializePushNotifications().catch(() => {});
      return { ok: true };
    } catch (err) {
      const message = getApiErrorMessage(err, "Login failed.");
      setError(message);
      return { ok: false, message };
    } finally {
      setLoading(false);
      setTokenReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Clear the local secure session even if the backend token is already invalid.
    } finally {
      await teardownPushNotifications().catch(() => {});
      await clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      clearSession,
      error,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      tokenReady,
      user,
    }),
    [clearSession, error, loading, login, logout, tokenReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
