const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { getMemoById } = require("../services/memoService");
const notificationService = require("../services/notificationService");
const { validateProgress } = require("../utils/validators");
const { logAudit } = require("../utils/audit");
const { isHeavyWorkflow } = require("../utils/workflowDoctrine");

function normalizeCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}

function isFundsReleased(memo) {
  const releaseStatus = normalizeCode(memo?.fund_release_status);
  const lifecycle = normalizeCode(memo?.lifecycle_stage);
  const totalReleased = Number(memo?.total_released_amount || 0);

  return (
    totalReleased > 0 ||
    ["PARTIALLY_FUNDED", "WAITING_PAYMENT", "PAID"].includes(releaseStatus) ||
    ["FUNDS_RELEASED", "IN_PROGRESS", "VALIDATION_REJECTED", "AWAITING_VALIDATION"].includes(lifecycle)
  );
}

function canMonitorMemo(user, memo) {
  if (user?.role === "SUPER_ADMIN") return true;
  if (user?.role !== "MONITOR") return false;

  if (memo?.assigned_to_user_id && user?.id) {
    if (String(memo.assigned_to_user_id) === String(user.id)) {
      return true;
    }
  }

  const userBranch = normalizeCode(user?.branch_dru);
  const monitorBranch = normalizeCode(memo?.primary_monitor_branch);

  return Boolean(userBranch && monitorBranch && userBranch === monitorBranch);
}

function canReadProgressReports(user, memo) {
  if (["SUPER_ADMIN", "CAS"].includes(user?.role)) return true;
  if (user?.role === "MONITOR") return canMonitorMemo(user, memo);
  if (user?.role === "VALIDATOR") {
    if (memo?.assigned_validator_user_id && user?.id) {
      if (String(memo.assigned_validator_user_id) === String(user.id)) {
        return true;
      }
    }

    const userBranch = normalizeCode(user?.branch_dru);
    const validatorBranch = normalizeCode(memo?.validator_branch);

    return Boolean(userBranch && validatorBranch && userBranch === validatorBranch);
  }

  return false;
}

const updateProgressHandler = async (req, res, next) => {
  try {
    const {
      progress_percent,
      status_note = null,
      evidence_url = null,
      report_date
    } = req.body;

    const memo = await getMemoById(req.params.id);
    if (memo && !isHeavyWorkflow(memo.category)) {
      return errorResponse(
        res,
        "Light workflow memos do not require monitoring.",
        400
      );
    }

    if (memo && !canMonitorMemo(req.user, memo)) {
      return errorResponse(res, "This memo is not assigned to your monitor unit.", 403);
    }

    if (memo && !isFundsReleased(memo)) {
      return errorResponse(res, "Progress reporting starts only after funds are released.", 400);
    }

    const validationError = validateProgress(memo, req.body);

    if (validationError) {
      return errorResponse(
        res,
        validationError,
        validationError === "Memo not found" ? 404 : 400
      );
    }

    const result = await pool.query(
      `INSERT INTO memo_progress_logs
       (memo_id, progress_percent, status_note, evidence_url, report_date, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.id,
        progress_percent,
        status_note,
        evidence_url,
        report_date,
        req.user.id
      ]
    );

    let nextStage = "IN_PROGRESS";
    let nextBusinessStatus = memo.business_status;

    if (Number(progress_percent) === 100) {
      nextStage = "AWAITING_VALIDATION";
      nextBusinessStatus = "AWAITING_VALIDATION";
    }

    await pool.query(
      `UPDATE memos
       SET progress_percent = $1,
           lifecycle_stage = $2,
           business_status = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        progress_percent,
        nextStage,
        nextBusinessStatus,
        req.params.id
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_PROGRESS",
      entityType: "MEMO",
      entityId: req.params.id,
      metadata: { progress_percent }
    });

    if (Number(progress_percent) === 100) {
      const metadata = {
        memo_id: req.params.id,
        reference_no: memo.reference_no,
        progress_percent: 100,
        lifecycle_stage: "AWAITING_VALIDATION",
        business_status: "AWAITING_VALIDATION",
        triggered_by_user_id: req.user.id,
        triggered_by_role: req.user.role || null,
        primary_monitor_branch: memo.primary_monitor_branch || null,
        validator_branch: memo.validator_branch || null,
      };

      const validationNotification = {
        memo_id: req.params.id,
        type: "VALIDATION_PENDING",
        title: "Validation Pending",
        message: "Monitor has submitted 100% completion. Validation is required.",
        metadata
      };

      if (memo.assigned_validator_user_id) {
        await notificationService.createUserNotificationOnce(memo.assigned_validator_user_id, validationNotification);
      } else {
        await notificationService.createValidatorBranchNotificationOnce(memo.validator_branch, validationNotification);
      }

      await notificationService.createRoleNotificationOnce("CAS", {
        memo_id: req.params.id,
        type: "VALIDATION_PENDING",
        title: "Validation Pending",
        message: "Monitor submitted 100% completion. Project is awaiting validation.",
        metadata
      });

      if (memo.assigned_to_user_id) {
        await notificationService.createUserNotificationOnce(memo.assigned_to_user_id, {
          memo_id: req.params.id,
          type: "VALIDATION_PENDING",
          title: "Submitted for Validation",
          message: "Your progress report has been submitted for validation.",
          metadata
        });
      } else {
        await notificationService.createRoleNotificationOnce("MONITOR", {
          memo_id: req.params.id,
          type: "VALIDATION_PENDING",
          title: "Submitted for Validation",
          message: "Progress has been submitted for validation.",
          metadata
        });
      }
    }

    return successResponse(res, "Progress updated successfully", result.rows[0], 201);
  } catch (error) {
    next(error);
  }
};

const getProgressReportsHandler = async (req, res, next) => {
  try {
    const memo = await getMemoById(req.params.id);

    if (!memo) {
      return errorResponse(res, "Memo not found", 404);
    }

    if (!canReadProgressReports(req.user, memo)) {
      return errorResponse(res, "Forbidden: progress reports are restricted to assigned dashboard roles", 403);
    }

    const result = await pool.query(
      `SELECT
         p.id,
         p.memo_id,
         p.progress_percent,
         p.status_note,
         p.evidence_url,
         p.report_date,
         p.reported_by,
         u.full_name AS reported_by_name,
         p.created_at
       FROM memo_progress_logs p
       LEFT JOIN users u ON u.id = p.reported_by
       WHERE p.memo_id = $1
       ORDER BY p.report_date DESC, p.created_at DESC`,
      [req.params.id]
    );

    return successResponse(res, "Progress reports fetched successfully", result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProgressHandler,
  getProgressReportsHandler
};
