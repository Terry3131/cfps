import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const localUnreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await API.get("/notifications/unread-count");
      const data = unwrapResponse(res);
      setUnreadCount(data?.unread_count ?? data?.unreadCount ?? 0);
    } catch {
      setUnreadCount(localUnreadCount);
    }
  }, [localUnreadCount]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/notifications");
      const data = unwrapResponse(res);

      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount((Array.isArray(data) ? data : []).filter((item) => !item.is_read).length);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      setMarkingId(id);
      setError("");

      await API.patch(`/notifications/${id}/read`);
      await loadNotifications();
      await loadUnreadCount();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to mark notification as read.");
    } finally {
      setMarkingId("");
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      setError("");

      await API.patch("/notifications/read-all");
      await loadNotifications();
      await loadUnreadCount();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadUnreadCount();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    error,
    loading,
    markingId,
    markingAll,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications,
    reloadUnreadCount: loadUnreadCount,
  };
}
