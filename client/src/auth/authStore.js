import { VALID_ROLES } from "./roleAccess";

export function saveAuth(token, user) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem("auth_token");
}

export function getUser() {
  const user = localStorage.getItem("auth_user");

  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    clearAuth();
    return null;
  }
}

export function hasValidSession() {
  const token = getToken();
  const user = getUser();

  if (!token || !user?.role || !VALID_ROLES.includes(user.role)) {
    clearAuth();
    return false;
  }

  return true;
}

export function clearAuth() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function isLoggedIn() {
  return hasValidSession();
}