import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import { formatDateTime } from "../utils/format";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    markingId,
    markAsRead,
    reload,
    reloadUnreadCount,
  } = useNotifications();

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      reloadUnreadCount();
      if (open) reload();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [open, reload, reloadUnreadCount]);

  const toggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await reload();
    }
  };

  const latestNotifications = notifications.slice(0, 6);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        Alerts
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              View all
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading notifications...</p>
            ) : latestNotifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              latestNotifications.map((item) => {
                const isRead = Boolean(item.is_read);
                const createdAt = item.created_at || item.createdAt;
                const href = getNotificationHref(item);

                return (
                  <div key={item.id} className={`border-b border-slate-100 px-4 py-3 ${isRead ? "bg-white" : "bg-blue-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">
                          {item.type || "NOTIFICATION"}
                        </p>
                        {href ? (
                          <Link
                            to={href}
                            onClick={() => {
                              setOpen(false);
                              if (!isRead) markAsRead(item.id);
                            }}
                            className="mt-1 block text-sm font-semibold text-slate-900 hover:text-blue-700"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                        )}
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          {createdAt ? formatDateTime(createdAt) : "N/A"}
                        </p>
                      </div>

                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => markAsRead(item.id)}
                          disabled={markingId === item.id}
                          className="shrink-0 text-xs font-semibold text-blue-700 disabled:opacity-60"
                        >
                          {markingId === item.id ? "..." : "Read"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getNotificationHref(item) {
  const memoId = item?.memo_id || item?.memoId || item?.metadata?.memo_id || item?.metadata?.memoId;

  if (!memoId) return "";

  if (String(item?.type || "").toUpperCase() === "VALIDATION_PENDING") {
    return `/memos/${memoId}/validate`;
  }

  return `/memos/${memoId}`;
}
