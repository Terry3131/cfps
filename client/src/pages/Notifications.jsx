import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { formatDateTime } from "../utils/format";
import useNotifications from "../hooks/useNotifications";

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    error,
    loading,
    markingId,
    markingAll,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="space-y-5">
      <BackButton fallback="/memos" />
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
        action={
          <ActionButton
            onClick={markAllAsRead}
            disabled={loading || markingAll || unreadCount === 0}
          >
            {markingAll ? "Marking..." : "Mark All Read"}
          </ActionButton>
        }
      />

      <ErrorBox message={error} />

      {loading ? (
        <LoadingBox message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications found."
          message="System alerts and memo updates will appear here."
        />
      ) : (
        <SectionCard bodyClassName="p-0" className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {notifications.map((item) => {
              const isRead = Boolean(item.is_read);
              const title = item.title || item.type || "Notification";
              const message = item.message || item.description || "No message";
              const createdAt = item.created_at || item.createdAt;
              const href = getNotificationHref(item);

              return (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between ${
                    isRead ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {title}
                      </p>

                      {!isRead && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">
                      {message}
                    </p>

                    <p className="text-xs text-slate-400 mt-2">
                      {createdAt ? formatDateTime(createdAt) : "N/A"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {href && (
                      <ActionButton
                        to={href}
                        variant="primary"
                        onClick={() => {
                          if (!isRead) markAsRead(item.id);
                        }}
                      >
                        Open
                      </ActionButton>
                    )}

                    {!isRead && (
                      <ActionButton
                        variant="link"
                        onClick={() => markAsRead(item.id)}
                        disabled={markingId === item.id}
                      >
                        {markingId === item.id ? "Marking..." : "Mark Read"}
                      </ActionButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
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
