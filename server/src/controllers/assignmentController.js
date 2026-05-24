const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { getMemoById } = require("../services/memoService");
const notificationService = require("../services/notificationService");
const { validateAssignment } = require("../utils/validators");
const { logAudit } = require("../utils/audit");
const { isHeavyWorkflow } = require("../utils/workflowDoctrine");

function normalizeOrgUnitCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}

async function isAssignableOrgUnit(code) {
  const result = await pool.query(
    `SELECT id
     FROM organizational_units
     WHERE code = $1
       AND unit_type IN ('HQ_BRANCH', 'DIRECT_TO_CAS_OFFICE')
       AND is_active = TRUE
     LIMIT 1`,
    [code]
  );

  return Boolean(result.rows[0]);
}

const assignMemoHandler = async (req, res, next) => {
  try {
    const primary_monitor_branch = normalizeOrgUnitCode(req.body.primary_monitor_branch);
    const validator_branch = normalizeOrgUnitCode(req.body.validator_branch);
    const {
      assigned_to_user_id = null,
      assigned_validator_user_id = null,
    } = req.body;
    const assignmentBody = {
      ...req.body,
      primary_monitor_branch,
      validator_branch,
    };

    const memo = await getMemoById(req.params.id);
    if (memo && !isHeavyWorkflow(memo.category)) {
      return errorResponse(
        res,
        "Light workflow memos do not require assignment",
        400
      );
    }

    const validationError = validateAssignment(memo, assignmentBody);

    if (validationError) {
      return errorResponse(
        res,
        validationError,
        validationError === "Memo not found" ? 404 : 400
      );
    }

    const [monitorAllowed, validatorAllowed] = await Promise.all([
      isAssignableOrgUnit(primary_monitor_branch),
      isAssignableOrgUnit(validator_branch),
    ]);

    if (!monitorAllowed) {
      return errorResponse(res, "primary_monitor_branch must be an active HQ branch or Direct-to-CAS office", 400);
    }

    if (!validatorAllowed) {
      return errorResponse(res, "validator_branch must be an active HQ branch or Direct-to-CAS office", 400);
    }

    const existing = await pool.query(
      `SELECT id FROM memo_assignments WHERE memo_id = $1 LIMIT 1`,
      [req.params.id]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE memo_assignments
         SET primary_monitor_branch = $1,
             validator_branch = $2,
             assigned_to_user_id = $3,
             assigned_validator_user_id = $4,
             assigned_by = $5,
             updated_at = NOW()
         WHERE memo_id = $6
         RETURNING *`,
        [
          primary_monitor_branch,
          validator_branch,
          assigned_to_user_id,
          assigned_validator_user_id,
          req.user.id,
          req.params.id
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO memo_assignments
         (memo_id, primary_monitor_branch, validator_branch, assigned_to_user_id, assigned_validator_user_id, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.params.id,
          primary_monitor_branch,
          validator_branch,
          assigned_to_user_id,
          assigned_validator_user_id,
          req.user.id
        ]
      );
    }

    await pool.query(
      `UPDATE memos
       SET lifecycle_stage = 'ASSIGNED',
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    await logAudit({
      userId: req.user.id,
      action: "ASSIGN_MEMO",
      entityType: "MEMO",
      entityId: req.params.id,
      metadata: {
        primary_monitor_branch,
        validator_branch,
        assigned_to_user_id,
        assigned_validator_user_id
      }
    });

    const metadata = {
      reference_no: memo.reference_no,
      primary_monitor_branch,
      validator_branch,
      assigned_to_user_id,
      assigned_validator_user_id
    };

    if (assigned_to_user_id) {
      await notificationService.createUserNotificationOnce(assigned_to_user_id, {
        memo_id: req.params.id,
        type: "MEMO_ASSIGNED",
        title: "Memo Assigned",
        message: `Memo ${memo.reference_no} has been assigned for monitoring.`,
        metadata,
      });
    } else {
      await notificationService.createRoleNotificationOnce("MONITOR", {
        memo_id: req.params.id,
        type: "MEMO_ASSIGNED",
        title: "Memo Assigned",
        message: `Memo ${memo.reference_no} has been assigned for monitoring.`,
        metadata,
      });
    }

    const validatorNotification = {
        memo_id: req.params.id,
        type: "VALIDATOR_ASSIGNED",
        title: "Memo Assigned for Validation",
        message: `Memo ${memo.reference_no} has been assigned with validator unit ${validator_branch}.`,
        metadata,
      };

    await Promise.all([
      assigned_validator_user_id
        ? notificationService.createUserNotificationOnce(assigned_validator_user_id, validatorNotification)
        : notificationService.createValidatorBranchNotificationOnce(validator_branch, validatorNotification),
      notificationService.createRoleNotificationOnce("CAS", {
        memo_id: req.params.id,
        type: "MEMO_ASSIGNED",
        title: "Memo Assigned",
        message: `Memo ${memo.reference_no} has monitor and validator assignments.`,
        metadata,
      }),
    ]);

    return successResponse(res, "Memo assigned successfully", result.rows[0], 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignMemoHandler
};
