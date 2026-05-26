import api, { apiPath, unwrapResponse } from "../api/client";

export async function loginRequest(username, password) {
  const response = await api.post(apiPath("/auth/login"), { username, password });
  return unwrapResponse(response);
}

export async function meRequest() {
  const response = await api.get(apiPath("/auth/me"));
  return unwrapResponse(response);
}

export async function logoutRequest() {
  const response = await api.post(apiPath("/auth/logout"));
  return unwrapResponse(response);
}
