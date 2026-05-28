import api, { extractCollection, getApiErrorMessage, unwrapResponse } from "../api/client";

export const NOTIFICATION_MANUAL_REFRESH_COOLDOWN_MS = 8000;
export const NOTIFICATION_POLL_AFTER_MANUAL_SKIP_MS = 30000;
export const NOTIFICATION_RATE_LIMIT_COOLDOWN_MS = 60000;

let notificationFetchPromise = null;
let notificationFetchCooldownUntil = 0;
let lastManualRefreshAt = 0;
let lastNotifications = [];

export async function fetchNotifications({ source = "unknown" } = {}) {
  const now = Date.now();

  if (source === "manual" && now - lastManualRefreshAt < NOTIFICATION_MANUAL_REFRESH_COOLDOWN_MS) {
    logNotificationFetch(`skipped fetch due to manual refresh cooldown (${source})`);
    return lastNotifications;
  }

  if (notificationFetchCooldownUntil > now) {
    logNotificationFetch(`skipped fetch due to cooldown (${source})`);

    if (source === "poll") {
      return lastNotifications;
    }

    throw createNotificationCooldownError();
  }

  if (source === "poll" && now - lastManualRefreshAt < NOTIFICATION_POLL_AFTER_MANUAL_SKIP_MS) {
    logNotificationFetch("skipped fetch because manual refresh ran recently");
    return lastNotifications;
  }

  if (notificationFetchPromise) {
    logNotificationFetch(`skipped fetch due to in-flight request (${source})`);
    return notificationFetchPromise;
  }

  if (source === "manual") {
    lastManualRefreshAt = now;
  }

  logNotificationFetch(`notification fetch start (${source})`);

  notificationFetchPromise = api.get("/notifications")
    .then((response) => {
      lastNotifications = extractCollection(response?.data, "notifications");
      return lastNotifications;
    })
    .catch((err) => {
      if (isNotificationRateLimitError(err)) {
        notificationFetchCooldownUntil = Date.now() + NOTIFICATION_RATE_LIMIT_COOLDOWN_MS;
        logNotificationFetch("429 cooldown activated");
        throw createNotificationCooldownError();
      }

      throw err;
    })
    .finally(() => {
      notificationFetchPromise = null;
    });

  return notificationFetchPromise;
}

export async function markNotificationRead(id) {
  try {
    const response = await api.patch(`/notifications/${id}/read`);
    return unwrapResponse(response);
  } catch (err) {
    throw new Error(getApiErrorMessage(err, "Unable to mark notification as read."));
  }
}

export async function markNotificationsReadAll() {
  try {
    const response = await api.patch("/notifications/read-all");
    return unwrapResponse(response);
  } catch (err) {
    throw new Error(getApiErrorMessage(err, "Unable to mark all notifications as read."));
  }
}

export async function deleteNotification(id) {
  try {
    const response = await api.delete(`/notifications/${id}`);
    return unwrapResponse(response);
  } catch (err) {
    throw new Error(getApiErrorMessage(err, "Unable to delete notification."));
  }
}

export async function fetchMemoById(id) {
  const response = await api.get(`/memos/${id}`);
  return unwrapResponse(response);
}

function createNotificationCooldownError() {
  return new Error("Notification refresh is cooling down briefly. Please try again shortly.");
}

function isNotificationRateLimitError(error) {
  const message = getApiErrorMessage(error, "").toLowerCase();

  return (
    error?.response?.status === 429 ||
    message.includes("request limit reached")
  );
}

function logNotificationFetch(message) {
  const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : "production";
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : nodeEnv !== "production";

  if (isDev) {
    console.log(`[notifications] ${message}`);
  }
}
