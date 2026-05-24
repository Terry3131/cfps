const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { getMemoById } = require("../services/memoService");
const notificationService = require("../services/notificationService");
const { validateValidation } = require("../utils/validators");
const { logAudit } = require("../utils/audit");
const { isHeavyWorkflow } = require("../utils/workflowDoctrine");
const { canValidatorAccessMemo } = require("../utils/validatorAccess");

const validateMemoHandler = async (req, res, next) => {
  try {
    const { validation_note = null, is_valid } = req.body;

    const memo = await getMemoById(req.params.id);
    if (memo && !isHeavyWorkflow(memo.category)) {
      return errorResponse(
        res,
        "Light workflow memos do not require validation",
        400
      );
    }

    if (memo && !canValidatorAccessMemo(req.user, memo, { allowSuperAdmin: true })) {
      return errorResponse(res, "Forbidden: validator is not assigned to this memo", 403);
    }

    const validationError = validateValidation(memo, req.body);

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

      const validationResult = await client.query(
        `INSERT INTO memo_validations (memo_id, validation_note, is_valid, validated_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.params.id, validation_note, is_valid, req.user.id]
      );

      const nextProgress = Number(memo.progress_percent);

      let nextStage = "COMPLETED";
      let nextBusinessStatus = "COMPLETED";
      let nextIsLocked = true;
      let nextIsCompleted = true;

      if (is_valid === false) {
        nextStage = "IN_PROGRESS";
        nextBusinessStatus = "VALIDATION_REJECTED";
        nextIsLocked = false;
        nextIsCompleted = false;
      }

      await client.query(
        `UPDATE memos
         SET progress_percent = $1,
             lifecycle_stage = $2,
             business_status = $3,
             is_locked = $4,
             is_completed = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          nextProgress,
          nextStage,
          nextBusinessStatus,
          nextIsLocked,
          nextIsCompleted,
          req.params.id
        ]
      );

      await client.query("COMMIT");

      await logAudit({
        userId: req.user.id,
        action: "VALIDATE_MEMO",
        entityType: "MEMO",
        entityId: req.params.id,
        metadata: { is_valid, category: memo.category }
      });

      await notificationService.markUnreadNotificationsAsRead({
        memo_id: req.params.id,
        target_role: "VALIDATOR",
        type: "VALIDATION_PENDING"
      });
      await notificationService.markUnreadNotificationsAsRead({
        memo_id: req.params.id,
        target_user_id: req.user.id,
        type: "VALIDATION_PENDING"
      });
      await notificationService.markUnreadNotificationsAsRead({
        memo_id: req.params.id,
        target_role: "CAS",
        type: "VALIDATION_PENDING"
      });

      const validationMetadata = {
        memo_id: req.params.id,
        reference_no: memo.reference_no,
        progress_percent: nextProgress,
        lifecycle_stage: nextStage,
        business_status: nextBusinessStatus,
        is_valid,
        validation_decision: is_valid === true ? "APPROVED" : "REJECTED",
        triggered_by_user_id: req.user.id,
        triggered_by_role: req.user.role || null
      };

      if (is_valid === true) {
        await notificationService.createRoleNotification("CAS", {
          memo_id: req.params.id,
          type: "VALIDATION_APPROVED",
          title: "Validation Approved",
          message: "Project validation approved and completed.",
          metadata: validationMetadata
        });

        const monitorNotification = {
          memo_id: req.params.id,
          type: "VALIDATION_APPROVED",
          title: "Validation Approved",
          message: "Validation approved. Project marked as completed.",
          metadata: validationMetadata
        };

        if (memo.assigned_to_user_id) {
          await notificationService.createUserNotification(
            memo.assigned_to_user_id,
            monitorNotification
          );
        } else {
          await notificationService.createRoleNotification("MONITOR", monitorNotification);
        }
      } else {
        await notificationService.createRoleNotification("CAS", {
          memo_id: req.params.id,
          type: "VALIDATION_REJECTED",
          title: "Validation Rejected",
          message: "Validation rejected. Monitor follow-up required.",
          metadata: validationMetadata
        });

        const monitorNotification = {
          memo_id: req.params.id,
          type: "VALIDATION_REJECTED",
          title: "Validation Rejected",
          message: "Validation rejected. Follow-up is required.",
          metadata: validationMetadata
        };

        if (memo.assigned_to_user_id) {
          await notificationService.createUserNotification(
            memo.assigned_to_user_id,
            monitorNotification
          );
        } else {
          await notificationService.createRoleNotification("MONITOR", monitorNotification);
        }
      }

      return successResponse(res, "Memo validated successfully", validationResult.rows[0], 201);
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
  validateMemoHandler
};
