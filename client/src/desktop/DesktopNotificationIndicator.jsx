import { useCallback, useEffect, useRef, useState } from "react";
import { desktopApi, isDesktopShell } from "./desktopApi";

export default function DesktopNotificationIndicator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [banner, setBanner] = useState("");
  const previousUnreadRef = useRef(0);

  const pollNotifications = useCallback(async () => {
    if (!isDesktopShell() || !navigator.onLine) return;

    try {
      const result = await desktopApi.notifications.summary();
      const nextUnreadCount = Number(result?.unreadCount || result?.unread_count || 0);

      if (nextUnreadCount > previousUnreadRef.current) {
        setBanner(`${nextUnreadCount} unread operational notification${nextUnreadCount === 1 ? "" : "s"}.`);
      }

      previousUnreadRef.current = nextUnreadCount;
      setUnreadCount(nextUnreadCount);
    } catch {
      // Desktop notification polling must never interrupt offline work.
    }
  }, []);

  useEffect(() => {
    if (!isDesktopShell()) return undefined;

    pollNotifications();

    const timer = window.setInterval(pollNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [pollNotifications]);

  if (!isDesktopShell() || (unreadCount === 0 && !banner)) {
    return null;
  }

  return (
    <div className="border-b border-blue-100 bg-blue-50 px-6 py-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Desktop alerts: {unreadCount} unread
          </p>
          {banner && (
            <p className="mt-1 text-xs text-blue-800">{banner}</p>
          )}
        </div>

        {banner && (
          <button
            type="button"
            onClick={() => setBanner("")}
            className="self-start rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 md:self-auto"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
