import { normalizeRole } from "./roles";

export const REQUIRED_NOTIFICATION_TYPES = [
  "MEMO_APPROVED",
  "FUNDS_RELEASED",
  "VALIDATION_PENDING",
  "VALIDATION_APPROVED",
  "VALIDATION_REJECTED",
  "SYNC_FAILED",
  "SYNC_CONFLICT",
  "MONITOR_REPORT_DUE",
  "MONITOR_REPORT_OVERDUE",
];

const TYPE_ALIASES = {
  CAB_RELEASE_DELAY: "FUNDS_RELEASED",
  COMMENCEMENT_OVERDUE: "MONITOR_REPORT_OVERDUE",
  PROGRESS_OVERDUE: "MONITOR_REPORT_OVERDUE",
};

const PRIORITY_BY_TYPE = {
  SYNC_FAILED: "high",
  SYNC_CONFLICT: "high",
  VALIDATION_REJECTED: "high",
  MONITOR_REPORT_OVERDUE: "high",
  VALIDATION_PENDING: "medium",
  FUNDS_RELEASED: "medium",
  MEMO_APPROVED: "medium",
  MONITOR_REPORT_DUE: "medium",
  VALIDATION_APPROVED: "normal",
};

const GLOBAL_TYPE_SCOPE_BY_ROLE = {
  CAS: new Set(REQUIRED_NOTIFICATION_TYPES),
  MONITOR: new Set([
    "FUNDS_RELEASED",
    "MONITOR_REPORT_DUE",
    "MONITOR_REPORT_OVERDUE",
    "VALIDATION_REJECTED",
  ]),
  VALIDATOR: new Set(["VALIDATION_PENDING"]),
  CAB: new Set(["MEMO_APPROVED", "FUNDS_RELEASED"]),
  CASH_OFFICE: new Set(["MEMO_APPROVED", "FUNDS_RELEASED"]),
  REGISTRY: new Set(["SYNC_FAILED", "SYNC_CONFLICT"]),
  VIEWER: new Set(REQUIRED_NOTIFICATION_TYPES),
};

export function normalizeNotificationType(type) {
  const normalized = String(type || "UNKNOWN").toUpperCase();
  return TYPE_ALIASES[normalized] || normalized;
}

export function getNotificationPriority(item, role) {
  const type = normalizeNotificationType(item?.type);
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "CAS" && ["SYNC_FAILED", "SYNC_CONFLICT", "VALIDATION_REJECTED"].includes(type)) {
    return "high";
  }

  return PRIORITY_BY_TYPE[type] || "normal";
}

export function getRelatedMemoReference(item) {
  const metadata = item?.metadata || {};

  return (
    metadata.reference_no ||
    metadata.referenceNo ||
    item?.reference_no ||
    item?.memo_reference ||
    item?.memoReference ||
    null
  );
}

export function getRelatedMemoId(item) {
  const metadata = item?.metadata || {};

  return (
    item?.memo_id ||
    item?.memoId ||
    metadata.memo_id ||
    metadata.memoId ||
    null
  );
}

export function getNotificationTargetRole(item) {
  return normalizeRole(
    item?.target_role ||
      item?.targetRole ||
      item?.role ||
      item?.metadata?.target_role ||
      item?.metadata?.targetRole
  );
}

export function canRoleSeeNotification(item, role) {
  const normalizedRole = normalizeRole(role);
  const targetRole = getNotificationTargetRole(item);

  if (!normalizedRole) return false;
  if (targetRole && targetRole !== normalizedRole) return false;
  if (targetRole === normalizedRole) return true;

  const scopedTypes = GLOBAL_TYPE_SCOPE_BY_ROLE[normalizedRole];
  if (!scopedTypes) return false;

  return scopedTypes.has(normalizeNotificationType(item?.type));
}

export function filterNotificationsForRole(notifications, role) {
  if (!Array.isArray(notifications)) return [];
  return notifications.filter((item) => canRoleSeeNotification(item, role));
}

export function getAlertGroupLabel(item, role) {
  const type = normalizeNotificationType(item?.type);
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "CAS") {
    if (["VALIDATION_PENDING", "VALIDATION_APPROVED", "VALIDATION_REJECTED"].includes(type)) {
      return "Validation Alerts";
    }

    if (["FUNDS_RELEASED"].includes(type)) {
      return "Release Alerts";
    }

    return "Executive Alerts";
  }

  if (normalizedRole === "MONITOR") {
    if (type === "VALIDATION_REJECTED") return "Validation Rejection Alerts";
    if (["MONITOR_REPORT_DUE", "MONITOR_REPORT_OVERDUE"].includes(type)) return "Overdue Alerts";
    if (type === "FUNDS_RELEASED") return "Release Alerts";
  }

  if (normalizedRole === "VALIDATOR") {
    if (type === "VALIDATION_PENDING") return "Validation Pending Alerts";
  }

  if (normalizedRole === "CAB") {
    if (["FUNDS_RELEASED", "MEMO_APPROVED"].includes(type)) return "Release / Action Alerts";
  }

  if (normalizedRole === "CASH_OFFICE") return "Release Alerts";
  if (normalizedRole === "REGISTRY") return "Registry Alerts";

  return "General Alerts";
}

export function groupNotificationsByRole(notifications, role) {
  return filterNotificationsForRole(notifications, role).reduce((groups, item) => {
    const label = getAlertGroupLabel(item, role);
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }

    return groups;
  }, []);
}
