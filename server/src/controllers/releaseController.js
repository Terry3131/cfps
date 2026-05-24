const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { getMemoById } = require("../services/memoService");
const notificationService = require("../services/notificationService");
const { validateRelease } = require("../utils/validators");
const { logAudit } = require("../utils/audit");
const { isLightWorkflow } = require("../utils/workflowDoctrine");

const releaseFundsHandler = async (req, res, next) => {
  try {
    const {
      decision_type,
      released_amount = 0,
      release_percentage = null,
      next_release_date = null,
      next_payment_date = null,
      rejection_reason = null,
      remarks = null
    } = req.body;
    const nextPaymentDate = next_payment_date || next_release_date || null;

    const memo = await getMemoById(req.params.id);
    const validationError = validateRelease(memo, req.body);

    if (validationError) {
      return errorResponse(
        res,
        validationError,
        validationError === "Memo not found" ? 404 : 400
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO memo_releases
         (memo_id, released_amount, released_by, remarks, decision_type, release_percentage, next_release_date, next_payment_date, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.params.id,
          decision_type === "REJECTED" ? 0 : released_amount,
          req.user.id,
          remarks,
          decision_type,
          decision_type === "FULL" ? 100 : release_percentage,
          nextPaymentDate,
          nextPaymentDate,
          rejection_reason
        ]
      );

      let nextLifecycleStage = memo.lifecycle_stage;
      let nextBusinessStatus = memo.business_status;
      let nextProgressPercent = Number(memo.progress_percent || 0);
      let nextIsLocked = memo.is_locked;
      let nextIsCompleted = memo.is_completed;
      const remainingBalance = Number(memo.remaining_balance || memo.amount || 0);
      const normalizedReleasedAmount = decision_type === "REJECTED" ? 0 : Number(released_amount || 0);
      const fullyClearsBalance = decision_type !== "REJECTED" && normalizedReleasedAmount >= remainingBalance;

      if (decision_type === "REJECTED") {
        nextBusinessStatus = "FUND RELEASE REJECTED";
      }

      if (decision_type === "PARTIAL" && !fullyClearsBalance) {
        nextLifecycleStage = "FUNDS_RELEASED";
        nextBusinessStatus = "PARTIALLY FUNDED";
      }

      if (decision_type === "FULL" || fullyClearsBalance) {
        nextLifecycleStage = "FUNDS_RELEASED";
        nextBusinessStatus = "FUNDS RELEASED";
      }

      if (isLightWorkflow(memo.category) && (decision_type === "FULL" || fullyClearsBalance)) {
        nextLifecycleStage = "COMPLETED";
        nextBusinessStatus = "COMPLETED";
        nextProgressPercent = 100;
        nextIsLocked = true;
        nextIsCompleted = true;
      }

      await client.query(
        `UPDATE memos
         SET lifecycle_stage = $1,
             business_status = $2,
             progress_percent = $3,
             is_locked = $4,
             is_completed = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          nextLifecycleStage,
          nextBusinessStatus,
          nextProgressPercent,
          nextIsLocked,
          nextIsCompleted,
          req.params.id
        ]
      );

      await client.query("COMMIT");

      await logAudit({
        userId: req.user.id,
        action: isLightWorkflow(memo.category) && decision_type === "FULL"
          ? "AUTO_COMPLETE_LIGHT_WORKFLOW_RELEASE"
          : "RELEASE_FUNDS",
        entityType: "MEMO",
        entityId: req.params.id,
        metadata: {
          decision_type,
          released_amount,
          release_percentage,
          next_release_date: nextPaymentDate,
          next_payment_date: nextPaymentDate,
          rejection_reason
        }
      });

      const releaseNotification = {
        memo_id: req.params.id,
        type: "FUNDS_RELEASED",
        title: "Funds Released",
        message: `Funds release decision (${decision_type}) recorded for memo ${memo.reference_no}.`,
        metadata: {
          reference_no: memo.reference_no,
          decision_type,
          released_amount,
          release_percentage,
          next_release_date: nextPaymentDate,
          next_payment_date: nextPaymentDate,
          lifecycle_stage: nextLifecycleStage,
          business_status: nextBusinessStatus,
        }
      };

      await Promise.all([
        notificationService.markUnreadNotificationsAsRead({
          memo_id: req.params.id,
          target_role: "CAB",
          type: "MEMO_APPROVED",
        }),
        notificationService.markUnreadNotificationsAsRead({
          memo_id: req.params.id,
          target_role: "CASH_OFFICE",
          type: "MEMO_APPROVED",
        }),
        notificationService.createRoleNotificationOnce("MONITOR", releaseNotification),
        notificationService.createRoleNotificationOnce("CAS", releaseNotification),
        notificationService.createRoleNotificationOnce("CAB", releaseNotification),
        notificationService.createRoleNotificationOnce("CASH_OFFICE", releaseNotification),
      ]);

      // CAB countdown alert (only for PARTIAL)
      if (decision_type === "PARTIAL" && nextPaymentDate) {
        await notificationService.createRoleNotificationOnce("CASH_OFFICE", {
          memo_id: req.params.id,
          type: "CAB_RELEASE_COUNTDOWN",
          title: "Next Release Due",
          message: `Next release for memo ${memo.reference_no} is scheduled on ${nextPaymentDate}.`,
          expires_at: nextPaymentDate,
          metadata: {
            reference_no: memo.reference_no,
            next_release_date: nextPaymentDate,
            next_payment_date: nextPaymentDate,
            decision_type
          }
        });
      }

      return successResponse(res, "Funds release decision recorded successfully", result.rows[0], 201);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  releaseFundsHandler
};
