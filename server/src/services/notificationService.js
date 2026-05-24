const db = require("../config/db");

const SCHEDULED_NOTIFICATION_TYPES = {
  CAB_RELEASE_DELAY: "CAB_RELEASE_DELAY",
  COMMENCEMENT_OVERDUE: "COMMENCEMENT_OVERDUE",
  PROGRESS_OVERDUE: "PROGRESS_OVERDUE",
  VALIDATION_PENDING: "VALIDATION_PENDING",
  VALIDATION_APPROVED: "VALIDATION_APPROVED",
  VALIDATION_REJECTED: "VALIDATION_REJECTED",
};

const SYNC_NOTIFICATION_TYPES = new Set(["SYNC_FAILED", "SYNC_CONFLICT"]);

function normalizeOrgCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}

async function createNotification({
  memo_id,
  target_user_id = null,
  target_role = null,
  type,
  title,
  message,
  expires_at = null,
  metadata = {},
}) {
  const result = await db.query(
    `
    INSERT INTO notifications (
      memo_id,
      target_user_id,
      target_role,
      type,
      title,
      message,
      expires_at,
      metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      memo_id,
      target_user_id,
      target_role,
      type,
      title,
      message,
      expires_at,
      metadata,
    ]
  );

  return result.rows[0];
}

async function createRoleNotification(target_role, notification) {
  return createNotification({
    ...notification,
    target_role,
    target_user_id: null,
  });
}

async function createRoleNotificationOnce(target_role, notification) {
  const exists = await unresolvedNotificationExists({
    type: notification.type,
    memo_id: notification.memo_id,
    target_role,
  });

  if (exists) return null;

  return createRoleNotification(target_role, notification);
}

async function createUserNotification(target_user_id, notification) {
  return createNotification({
    ...notification,
    target_user_id,
    target_role: null,
  });
}

async function createUserNotificationOnce(target_user_id, notification) {
  const exists = await unresolvedNotificationExists({
    type: notification.type,
    memo_id: notification.memo_id,
    target_user_id,
  });

  if (exists) return null;

  return createUserNotification(target_user_id, notification);
}

async function createValidatorBranchNotificationOnce(validatorBranch, notification) {
  const normalizedBranch = normalizeOrgCode(validatorBranch);

  if (!normalizedBranch) return [];

  const validators = await db.query(
    `
    SELECT id
    FROM users
    WHERE role = 'VALIDATOR'
      AND is_active = true
      AND (
        CASE
          WHEN UPPER(TRIM(COALESCE(branch_dru, ''))) = 'DIRECT_TO_CAS' THEN 'DIRECT_TO_CAS_OFFICE'
          ELSE UPPER(TRIM(COALESCE(branch_dru, '')))
        END
      ) = $1
    `,
    [normalizedBranch]
  );

  const created = [];

  for (const validator of validators.rows) {
    const item = await createUserNotificationOnce(validator.id, notification);
    if (item) created.push(item);
  }

  return created;
}

async function listVisibleNotificationsForUser(user) {
  const { id, role } = user;

  const result = await db.query(
    `
    SELECT *
    FROM notifications
    WHERE
      (
        target_user_id = $1
        OR target_role = $2
        OR (target_user_id IS NULL AND target_role IS NULL)
      )
    ORDER BY created_at DESC
    `,
    [id, role]
  );

  return result.rows;
}

async function getUnreadCountForUser(user) {
  const { id, role } = user;

  const result = await db.query(
    `
    SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE is_read = false
      AND (
        target_user_id = $1
        OR target_role = $2
        OR (target_user_id IS NULL AND target_role IS NULL)
      )
    `,
    [id, role]
  );

  return result.rows[0]?.unread_count || 0;
}

async function markNotificationAsRead(notificationId, user) {
  const { id, role } = user;

  const result = await db.query(
    `
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = $1
      AND (
        target_user_id = $2
        OR target_role = $3
        OR (target_user_id IS NULL AND target_role IS NULL)
      )
    RETURNING *
    `,
    [notificationId, id, role]
  );

  return result.rows[0];
}

async function markAllAsRead(user) {
  const { id, role } = user;

  await db.query(
    `
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE
      (
        target_user_id = $1
        OR target_role = $2
        OR (target_user_id IS NULL AND target_role IS NULL)
      )
      AND is_read = false
    `,
    [id, role]
  );

  return { success: true };
}

async function unresolvedNotificationExists({ type, memo_id, target_role = null, target_user_id = null }) {
  const result = await db.query(
    `
    SELECT id
    FROM notifications
    WHERE type = $1
      AND memo_id IS NOT DISTINCT FROM $2
      AND target_role IS NOT DISTINCT FROM $3
      AND target_user_id IS NOT DISTINCT FROM $4
      AND is_read = false
    LIMIT 1
    `,
    [type, memo_id, target_role, target_user_id]
  );

  return Boolean(result.rows[0]);
}

async function markUnreadNotificationsAsRead({ type, memo_id, target_role = null, target_user_id = null }) {
  await db.query(
    `
    UPDATE notifications
    SET is_read = true,
        read_at = COALESCE(read_at, NOW())
    WHERE type = $1
      AND memo_id IS NOT DISTINCT FROM $2
      AND target_role IS NOT DISTINCT FROM $3
      AND target_user_id IS NOT DISTINCT FROM $4
      AND is_read = false
    `,
    [type, memo_id, target_role, target_user_id]
  );
}

async function createScheduledRoleNotification(target_role, notification) {
  const exists = await unresolvedNotificationExists({
    type: notification.type,
    memo_id: notification.memo_id,
    target_role,
  });

  if (exists) return null;

  return createRoleNotification(target_role, notification);
}

async function createSyncNotification(type, metadata = {}) {
  if (!SYNC_NOTIFICATION_TYPES.has(type)) {
    const error = new Error("Unsupported sync notification type.");
    error.statusCode = 400;
    throw error;
  }

  const title = type === "SYNC_CONFLICT" ? "Desktop Sync Conflict" : "Desktop Sync Failed";
  const message = type === "SYNC_CONFLICT"
    ? "A desktop sync conflict requires registry review."
    : "A desktop sync item failed and requires registry review.";

  return createRoleNotification("REGISTRY", {
    memo_id: metadata.memo_id || metadata.memoId || null,
    type,
    title,
    message: metadata.message || message,
    metadata,
  });
}

async function runNotificationChecks() {
  const thresholds = {
    cabReleaseDelayDays: Number(process.env.NOTIFICATION_CAB_RELEASE_DELAY_DAYS || 7),
    commencementOverdueDays: Number(process.env.NOTIFICATION_COMMENCEMENT_OVERDUE_DAYS || 7),
    progressOverdueDays: Number(process.env.NOTIFICATION_PROGRESS_OVERDUE_DAYS || 14),
    validationPendingDays: Number(process.env.NOTIFICATION_VALIDATION_PENDING_DAYS || 3),
  };

  const summary = {
    created: 0,
    skipped: 0,
  };

  const createForRoles = async (roles, notification) => {
    for (const role of roles) {
      const created = await createScheduledRoleNotification(role, notification);
      if (created) summary.created += 1;
      else summary.skipped += 1;
    }
  };

  const cabReleaseDelay = await db.query(
    `
    SELECT id, reference_no, heading, approved_at
    FROM memos m
    WHERE m.approval_status = 'APPROVED'
      AND m.business_status = 'APPROVED'
      AND COALESCE(m.approved_at, m.updated_at, m.created_at) <= NOW() - ($1::int * INTERVAL '1 day')
      AND NOT EXISTS (
        SELECT 1
        FROM memo_releases r
        WHERE r.memo_id = m.id
          AND COALESCE(r.decision_type, '') <> 'REJECTED'
      )
    `,
    [thresholds.cabReleaseDelayDays]
  );

  for (const memo of cabReleaseDelay.rows) {
    await createForRoles(["CAB", "CAS"], {
      memo_id: memo.id,
      type: SCHEDULED_NOTIFICATION_TYPES.CAB_RELEASE_DELAY,
      title: "CAB Release Delay",
      message: `Memo ${memo.reference_no || memo.heading} has been approved for more than ${thresholds.cabReleaseDelayDays} days with no fund release.`,
      metadata: { reference_no: memo.reference_no, threshold_days: thresholds.cabReleaseDelayDays },
    });
  }

  const commencementOverdue = await db.query(
    `
    SELECT m.id, m.reference_no, m.heading, COALESCE(MAX(r.released_at), m.updated_at, m.created_at) AS released_at
    FROM memos m
    LEFT JOIN memo_releases r ON r.memo_id = m.id AND COALESCE(r.decision_type, '') <> 'REJECTED'
    WHERE m.lifecycle_stage = 'FUNDS_RELEASED'
      AND NOT EXISTS (SELECT 1 FROM memo_commencements c WHERE c.memo_id = m.id)
    GROUP BY m.id
    HAVING COALESCE(MAX(r.released_at), m.updated_at, m.created_at) <= NOW() - ($1::int * INTERVAL '1 day')
    `,
    [thresholds.commencementOverdueDays]
  );

  for (const memo of commencementOverdue.rows) {
    await createForRoles(["MONITOR", "CAS"], {
      memo_id: memo.id,
      type: SCHEDULED_NOTIFICATION_TYPES.COMMENCEMENT_OVERDUE,
      title: "Commencement Overdue",
      message: `Memo ${memo.reference_no || memo.heading} has released funds but no recorded commencement after ${thresholds.commencementOverdueDays} days.`,
      metadata: { reference_no: memo.reference_no, threshold_days: thresholds.commencementOverdueDays },
    });
  }

  const progressOverdue = await db.query(
    `
    SELECT
      m.id,
      m.reference_no,
      m.heading,
      GREATEST(
        COALESCE(MAX(p.created_at), 'epoch'::timestamp),
        COALESCE(MAX(c.recorded_at), 'epoch'::timestamp),
        COALESCE(m.updated_at, m.created_at)
      ) AS latest_activity_at
    FROM memos m
    LEFT JOIN memo_progress_logs p ON p.memo_id = m.id
    LEFT JOIN memo_commencements c ON c.memo_id = m.id
    WHERE m.lifecycle_stage IN ('COMMENCED', 'IN_PROGRESS')
    GROUP BY m.id
    HAVING GREATEST(
      COALESCE(MAX(p.created_at), 'epoch'::timestamp),
      COALESCE(MAX(c.recorded_at), 'epoch'::timestamp),
      COALESCE(m.updated_at, m.created_at)
    ) <= NOW() - ($1::int * INTERVAL '1 day')
    `,
    [thresholds.progressOverdueDays]
  );

  for (const memo of progressOverdue.rows) {
    await createForRoles(["MONITOR"], {
      memo_id: memo.id,
      type: SCHEDULED_NOTIFICATION_TYPES.PROGRESS_OVERDUE,
      title: "Progress Update Overdue",
      message: `Memo ${memo.reference_no || memo.heading} has no recent progress update after ${thresholds.progressOverdueDays} days.`,
      metadata: { reference_no: memo.reference_no, threshold_days: thresholds.progressOverdueDays },
    });
  }

  const validationPending = await db.query(
    `
    SELECT id, reference_no, heading, updated_at
    FROM memos m
    WHERE m.lifecycle_stage = 'AWAITING_VALIDATION'
      AND COALESCE(m.updated_at, m.created_at) <= NOW() - ($1::int * INTERVAL '1 day')
      AND NOT EXISTS (SELECT 1 FROM memo_validations v WHERE v.memo_id = m.id)
    `,
    [thresholds.validationPendingDays]
  );

  for (const memo of validationPending.rows) {
    await createForRoles(["VALIDATOR", "CAS"], {
      memo_id: memo.id,
      type: SCHEDULED_NOTIFICATION_TYPES.VALIDATION_PENDING,
      title: "Validation Pending",
      message: `Memo ${memo.reference_no || memo.heading} has been awaiting validation for more than ${thresholds.validationPendingDays} days.`,
      metadata: { reference_no: memo.reference_no, threshold_days: thresholds.validationPendingDays },
    });
  }

  return summary;
}

module.exports = {
  createNotification,
  createRoleNotification,
  createRoleNotificationOnce,
  createScheduledRoleNotification,
  createSyncNotification,
  createValidatorBranchNotificationOnce,
  createUserNotification,
  createUserNotificationOnce,
  getNotifications: listVisibleNotificationsForUser,
  getUnreadCountForUser,
  listVisibleNotificationsForUser,
  markAsRead: markNotificationAsRead,
  markNotificationAsRead,
  markUnreadNotificationsAsRead,
  markAllAsRead,
  runNotificationChecks,
};
