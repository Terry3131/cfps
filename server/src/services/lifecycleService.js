const db = require("../config/db");
const { validateApproval } = require("../utils/validators");
const notificationService = require("./notificationService");

async function approveMemo(memoId, approvedBy) {
  const memoCheckQuery = `
    SELECT id, business_status, lifecycle_stage, is_locked, is_completed
    FROM memos
    WHERE id = $1
    LIMIT 1
  `;

  const memoCheckResult = await db.query(memoCheckQuery, [memoId]);

  const memo = memoCheckResult.rows[0];

  const validationError = validateApproval(memo);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = validationError === "Memo not found" ? 404 : 400;
    throw error;
  }

  const updateQuery = `
    UPDATE memos
    SET
      business_status = 'APPROVED',
      approval_status = 'APPROVED',
      approved_by = $2,
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const updateResult = await db.query(updateQuery, [memoId, approvedBy]);

  await db.query(
    `
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [
      approvedBy,
      "APPROVE_MEMO",
      "MEMO",
      memoId,
      JSON.stringify({
        business_status: "APPROVED",
      }),
    ]
  );

  const approvedNotification = {
    memo_id: memoId,
    type: "MEMO_APPROVED",
    title: "Memo Approved",
    message: `Memo ${updateResult.rows[0].reference_no} has been approved and is ready for fund release action.`,
    metadata: {
      reference_no: updateResult.rows[0].reference_no,
      business_status: "APPROVED",
      approval_status: "APPROVED",
    },
  };

  await Promise.all([
    notificationService.createRoleNotificationOnce("CAB", approvedNotification),
    notificationService.createRoleNotificationOnce("CASH_OFFICE", approvedNotification),
    notificationService.createRoleNotificationOnce("CAS", approvedNotification),
  ]);

  return updateResult.rows[0];
}

module.exports = {
  approveMemo,
};
