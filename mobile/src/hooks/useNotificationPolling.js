import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { fetchNotifications } from "../services/notificationService";

export const NOTIFICATION_POLL_MS = 75000;

export function useNotificationPolling({ enabled, onError, onNotifications, pollMs = NOTIFICATION_POLL_MS }) {
  const activeRef = useRef(AppState.currentState === "active");
  const onErrorRef = useRef(onError);
  const onNotificationsRef = useRef(onNotifications);

  useEffect(() => {
    onErrorRef.current = onError;
    onNotificationsRef.current = onNotifications;
  }, [onError, onNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      activeRef.current = state === "active";
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (cancelled || inFlight || !activeRef.current) return;

      try {
        inFlight = true;
        const data = await fetchNotifications({ source: "poll" });
        if (!cancelled && typeof onNotificationsRef.current === "function") {
          onNotificationsRef.current(data);
        }
      } catch (err) {
        if (!cancelled && typeof onErrorRef.current === "function") {
          onErrorRef.current(err);
        }
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(poll, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, pollMs]);
}
